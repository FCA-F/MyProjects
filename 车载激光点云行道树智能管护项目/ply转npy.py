import os
import numpy as np
import open3d as o3d
from tqdm import tqdm

# 路径与参数配置
ROOT_DIR = r""  # 树木点云PLY文件根目录
TREE_NAMES = ["木樨", "悬铃木", "雪松", "樟树", "紫薇树"]  # 类别名称，对应标签1、2、3、4、5
# -------------------------------------------------------------------------
SAVE_DIR = r""  # 标准化点云样本保存目录
TARGET_POINT_NUM = 1024  # 每个点云样本固定采样点数
TRAIN_NUM_PER_CLASS = 35  # 单类别训练集样本数量
VAL_NUM_PER_CLASS = 5  # 单类别验证集样本数量
SEED = 42  # 随机种子，保证实验可复现
np.random.seed(SEED)

# -------------------------- 工具函数 --------------------------
def load_ply_get_xyz(ply_path):
    """
    读取PLY格式点云文件，提取三维坐标信息
    :param ply_path: PLY文件路径
    :return: 三维点云坐标数组 (N, 3)
    """
    pcd = o3d.io.read_point_cloud(ply_path)
    xyz = np.asarray(pcd.points)
    return xyz if xyz.shape[1] == 3 else xyz[:, :3]

def farthest_point_sample(point, npoint):
    """
    最远点采样算法，固定点云数量；点数不足时补零填充
    :param point: 原始点云坐标 (N, 3)
    :param npoint: 目标采样点数
    :return: 采样后的点云坐标 (npoint, 3)
    """
    N = point.shape[0]
    if N <= npoint:
        pad = np.zeros((npoint - N, 3), dtype=np.float32)
        return np.vstack([point, pad]).astype(np.float32)
    xyz = point[:, :3]
    centroids = np.zeros((npoint,), dtype=np.int32)
    distance = np.ones((N,), dtype=np.float32) * 1e10
    farthest = np.random.randint(0, N)
    for i in range(npoint):
        centroids[i] = farthest
        centroid = xyz[farthest]
        dist = np.sum((xyz - centroid) ** 2, axis=-1, dtype=np.float32)
        mask = dist < distance
        distance[mask] = dist[mask]
        farthest = np.argmax(distance)
    return point[centroids].astype(np.float32)

def pc_normalize(pc):
    """
    点云标准化：中心化处理 + 归一化至单位球体
    :param pc: 输入点云坐标
    :return: 标准化后的点云坐标
    """
    pc = pc.astype(np.float32)
    centroid = np.mean(pc, axis=0)
    pc = pc - centroid
    dists = np.sqrt(np.sum(pc ** 2, axis=1, dtype=np.float32))
    m = np.max(dists)
    return pc / m if m != 0 else pc

# 批量处理PLY文件，创建输出目录
os.makedirs(SAVE_DIR, exist_ok=True)

# 创建训练集/验证集子目录，清空历史标签文件
for split in ["train", "val"]:
    os.makedirs(os.path.join(SAVE_DIR, split), exist_ok=True)
    label_file = os.path.join(SAVE_DIR, f"{split}_labels.txt")
    if os.path.exists(label_file):
        os.remove(label_file)

# 初始化样本统计变量
total_train = 0
total_val = 0

# 逐类别处理点云数据
for label, tree_name in enumerate(TREE_NAMES, start=1):
    tree_dir = os.path.join(ROOT_DIR, tree_name)
    if not os.path.isdir(tree_dir):
        print(f"警告：未找到树种文件夹：{tree_dir}")
        continue
    ply_files = [f for f in os.listdir(tree_dir) if f.lower().endswith(".ply")]

    # 校验文件数量，自动调整训练/验证集划分比例
    if len(ply_files) != 40:
        print(f"警告：树种{tree_name}的PLY文件数量不是40个，实际数量为{len(ply_files)}个")
        TRAIN_NUM_PER_CLASS = int(len(ply_files) * 0.875)
        VAL_NUM_PER_CLASS = len(ply_files) - TRAIN_NUM_PER_CLASS
        print(f"提示：自动调整样本划分，{tree_name} 训练集={TRAIN_NUM_PER_CLASS}个，验证集={VAL_NUM_PER_CLASS}个")

    if not ply_files:
        print(f"警告：树种{tree_name}文件夹下无PLY文件")
        continue
    print(f"\n开始处理：{tree_name}（标签{label}），共计{len(ply_files)}个PLY文件")

    # 随机打乱文件顺序，划分训练集与验证集
    np.random.shuffle(ply_files)
    split_files = {
        "train": ply_files[:TRAIN_NUM_PER_CLASS],
        "val": ply_files[TRAIN_NUM_PER_CLASS:TRAIN_NUM_PER_CLASS + VAL_NUM_PER_CLASS]
    }

    # 逐子集处理点云文件
    for split, files in split_files.items():
        if not files:
            print(f"警告：树种{tree_name}的{split}集无有效文件")
            continue
        for file in tqdm(files, desc=f"{split}集处理中"):
            ply_path = os.path.join(tree_dir, file)
            xyz = load_ply_get_xyz(ply_path)
            xyz_sampled = farthest_point_sample(xyz, TARGET_POINT_NUM)
            xyz_norm = pc_normalize(xyz_sampled)

            # 标准化文件名并保存
            file_clean = file.replace(tree_name, "").strip()
            save_name = f"{tree_name}_{file_clean.replace('.ply', '.npy')}"

            # 保存标准化后的点云为NPY格式
            save_path = os.path.join(SAVE_DIR, split, save_name)
            np.save(save_path, xyz_norm)

            # 写入样本标签文件
            with open(os.path.join(SAVE_DIR, f"{split}_labels.txt"), "a", encoding="utf-8") as f:
                f.write(f"{save_name}\t{label}\n")

        # 累计样本数量
        if split == "train":
            total_train += len(files)
        else:
            total_val += len(files)

# 输出最终处理结果
print(f"\n处理完成：所有点云样本标准化处理完毕，保存路径：{SAVE_DIR}")
print(f"样本统计信息：")
print(f"   - 训练集：{total_train}个（每类{TRAIN_NUM_PER_CLASS}个）")
print(f"   - 验证集：{total_val}个（每类{VAL_NUM_PER_CLASS}个）")
print(f"处理说明：每个样本固定采样{TARGET_POINT_NUM}个点，已完成归一化与最远点采样")
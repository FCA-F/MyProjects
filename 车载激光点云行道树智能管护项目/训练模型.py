# ================================= 基础配置 =================================
# PointNet++ 树种点云分类训练脚本
# 硬件适配：RTX 5070 GPU | 数据策略：全量数据集按8:1:1划分为训练/验证/测试集
# ============================================================================
import os
import warnings
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from tqdm import tqdm
import multiprocessing
from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# 统一设置输出路径（你指定的文件夹）
SAVE_DIR = r""
os.makedirs(SAVE_DIR, exist_ok=True)  # 自动创建文件夹，不存在则新建

# Windows系统多进程兼容配置
multiprocessing.freeze_support()
os.environ['KMP_WARNINGS'] = 'off'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
torch.backends.cudnn.benchmark = True
warnings.filterwarnings('ignore',
                        message='NVIDIA GeForce RTX 5070 Laptop GPU with CUDA capability sm_120 is not compatible with the current PyTorch installation.')
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False


# -------------------------- PointNet++ 核心模块实现 --------------------------
def square_distance(src, dst):
    B, N, _ = src.shape
    _, M, _ = dst.shape
    dist = -2 * torch.matmul(src, dst.permute(0, 2, 1))
    dist += torch.sum(src ** 2, -1).view(B, N, 1)
    dist += torch.sum(dst ** 2, -1).view(B, 1, M)
    return dist


def index_points(points, idx):
    device = points.device
    B = points.shape[0]
    view_shape = list(idx.shape)
    view_shape[1:] = [1] * (len(view_shape) - 1)
    repeat_shape = list(idx.shape)
    repeat_shape[0] = 1
    batch_indices = torch.arange(B, dtype=torch.long).to(device).view(view_shape).repeat(repeat_shape)
    new_points = points[batch_indices, idx, :]
    return new_points


def farthest_point_sample(xyz, npoint):
    device = xyz.device
    B, N, C = xyz.shape
    centroids = torch.zeros(B, npoint, dtype=torch.long).to(device)
    distance = torch.ones(B, N).to(device) * 1e10
    farthest = torch.randint(0, N, (B,), dtype=torch.long).to(device)
    batch_indices = torch.arange(B, dtype=torch.long).to(device)
    for i in range(npoint):
        centroids[:, i] = farthest
        centroid = xyz[batch_indices, farthest, :].view(B, 1, C)
        dist = torch.sum((xyz - centroid) ** 2, -1)
        mask = dist < distance
        distance[mask] = dist[mask]
        farthest = torch.max(distance, -1)[1]
    return centroids


def query_ball_point(radius, nsample, xyz, new_xyz):
    device = xyz.device
    B, N, C = xyz.shape
    _, M, _ = new_xyz.shape
    group_idx = torch.arange(N, dtype=torch.long).to(device).view(1, 1, N).repeat([B, M, 1])
    sqrdists = square_distance(new_xyz, xyz)
    group_idx[sqrdists > radius ** 2] = N
    group_idx = group_idx.sort(dim=-1)[0][:, :, :nsample]
    group_first = group_idx[:, :, 0:1].repeat([1, 1, nsample])
    mask = group_idx == N
    group_idx[mask] = group_first[mask]
    return group_idx


class PointNetSetAbstraction(nn.Module):
    def __init__(self, npoint, radius, nsample, in_channel, mlp, group_all):
        super(PointNetSetAbstraction, self).__init__()
        self.npoint = npoint
        self.radius = radius
        self.nsample = nsample
        self.mlp_convs = nn.ModuleList()
        self.mlp_bns = nn.ModuleList()
        last_channel = in_channel
        for out_channel in mlp:
            self.mlp_convs.append(nn.Conv2d(last_channel, out_channel, 1, bias=False))
            self.mlp_bns.append(nn.BatchNorm2d(out_channel))
            last_channel = out_channel
        self.group_all = group_all

    def forward(self, xyz, points):
        B, N, C = xyz.shape
        if not self.group_all:
            fps_idx = farthest_point_sample(xyz, self.npoint)
            new_xyz = index_points(xyz, fps_idx)
            idx = query_ball_point(self.radius, self.nsample, xyz, new_xyz)
            grouped_xyz = index_points(xyz, idx) - new_xyz.view(B, self.npoint, 1, C)
            grouped_points = index_points(points, idx)
            grouped_points = torch.cat([grouped_points, grouped_xyz], dim=-1)
            new_points = grouped_points.permute(0, 3, 2, 1).contiguous()
        else:
            new_xyz = torch.zeros(B, 1, C).to(xyz.device)
            new_points = points.permute(0, 2, 1).unsqueeze(-1)
        for i, (conv, bn) in enumerate(zip(self.mlp_convs, self.mlp_bns)):
            new_points = F.relu(bn(conv(new_points)))
        new_points = torch.max(new_points, 2)[0].transpose(1, 2).contiguous()
        return new_xyz, new_points


class PointNet2Cls(nn.Module):
    def __init__(self, num_class=5):
        super(PointNet2Cls, self).__init__()
        self.sa1 = PointNetSetAbstraction(512, 0.2, 32, 6, [64, 64, 128], group_all=False)
        self.sa2 = PointNetSetAbstraction(128, 0.4, 64, 131, [128, 128, 256], group_all=False)
        self.sa3 = PointNetSetAbstraction(None, None, None, 256, [256, 512, 1024], group_all=True)

        self.fc1 = nn.Linear(1024, 512)
        self.fc2 = nn.Linear(512, 256)
        self.fc3 = nn.Linear(256, num_class)
        self.bn1 = nn.BatchNorm1d(512)
        self.bn2 = nn.BatchNorm1d(256)
        self.dropout = nn.Dropout(0.85)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        B = x.size(0)
        xyz = x.permute(0, 2, 1).contiguous()
        points = xyz
        sa1_xyz, sa1_points = self.sa1(xyz, points)
        sa2_xyz, sa2_points = self.sa2(sa1_xyz, sa1_points)
        sa3_xyz, sa3_points = self.sa3(sa2_xyz, sa2_points)
        x = sa3_points.view(B, -1)

        x = self.relu(self.bn1(self.fc1(x)))
        x = self.relu(self.bn2(self.dropout(self.fc2(x))))
        x = self.fc3(x)
        return F.log_softmax(x, dim=1)


# -------------------------- 点云数据集加载器 --------------------------
class TreePointCloudDataset(Dataset):
    def __init__(self, root_dir, split="all"):
        super(TreePointCloudDataset, self).__init__()
        self.root_dir = root_dir
        self.split = split

        self.file_to_label = {}
        for split_name in ["train", "val", "test"]:
            label_path = os.path.join(root_dir, f"{split_name}_labels.txt")
            if os.path.exists(label_path):
                with open(label_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        filename, label = line.split("\t")
                        self.file_to_label[filename] = int(label) - 1

        self.sample_files = []
        for split_name in ["train", "val", "test"]:
            sample_dir = os.path.join(root_dir, split_name)
            if os.path.exists(sample_dir):
                for f in os.listdir(sample_dir):
                    if f.endswith(".npy") and f in self.file_to_label:
                        self.sample_files.append((split_name, f))

    def __getitem__(self, idx):
        split_name, filename = self.sample_files[idx]
        sample_dir = os.path.join(self.root_dir, split_name)
        pc = np.load(os.path.join(sample_dir, filename))
        original_num_points = pc.shape[0]

        if self.split == "train":
            angle = np.random.uniform(-np.pi / 4, np.pi / 4)
            rotation_matrix = np.array([[np.cos(angle), 0, np.sin(angle)],[0, 1, 0],[-np.sin(angle), 0, np.cos(angle)]], dtype=np.float32)
            pc = pc @ rotation_matrix
            scale = np.random.uniform(0.7, 1.3)
            pc = pc * scale
            noise = np.random.normal(0, 0.008, pc.shape).astype(np.float32)
            pc = pc + noise
            translation = np.random.uniform(-0.1, 0.1, size=(1, 3)).astype(np.float32)
            pc = pc + translation
            drop_ratio = np.random.uniform(0.05, 0.1)
            keep_num = int(original_num_points * (1 - drop_ratio))
            drop_idx = np.random.choice(pc.shape[0], keep_num, replace=False)
            pc = pc[drop_idx]
            if pc.shape[0] < original_num_points:
                add_idx = np.random.choice(pc.shape[0], original_num_points - pc.shape[0], replace=True)
                pc = np.concatenate([pc, pc[add_idx]], axis=0)
            if np.random.rand() > 0.5: pc[:, 0] = -pc[:, 0]
            if np.random.rand() > 0.5: pc[:, 1] = -pc[:, 1]

        pc_tensor = torch.from_numpy(pc).float().permute(1, 0)
        label_tensor = torch.tensor(self.file_to_label[filename], dtype=torch.long)
        return pc_tensor, label_tensor

    def __len__(self):
        return len(self.sample_files)


# -------------------------- 训练/验证/测试函数 --------------------------
def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0
    for pc_batch, label_batch in tqdm(loader, desc="Training", ncols=80):
        pc_batch = pc_batch.to(device, non_blocking=True)
        label_batch = label_batch.to(device, non_blocking=True)
        optimizer.zero_grad()
        outputs = model(pc_batch)
        loss = criterion(outputs, label_batch)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        total_loss += loss.item()
        _, predicted = torch.max(outputs.data, 1)
        total += label_batch.size(0)
        correct += (predicted == label_batch).sum().item()
    return total_loss / len(loader), 100 * correct / total


def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    with torch.no_grad():
        for pc_batch, label_batch in tqdm(loader, desc="Validating", ncols=80):
            pc_batch = pc_batch.to(device, non_blocking=True)
            label_batch = label_batch.to(device, non_blocking=True)
            outputs = model(pc_batch)
            loss = criterion(outputs, label_batch)
            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += label_batch.size(0)
            correct += (predicted == label_batch).sum().item()
    return total_loss / len(loader), 100 * correct / total


def test_model(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    with torch.no_grad():
        for pc_batch, label_batch in tqdm(loader, desc="Testing", ncols=80):
            pc_batch = pc_batch.to(device, non_blocking=True)
            label_batch = label_batch.to(device, non_blocking=True)
            outputs = model(pc_batch)
            loss = criterion(outputs, label_batch)
            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += label_batch.size(0)
            correct += (predicted == label_batch).sum().item()
    return total_loss / len(loader), 100 * correct / total


# -------------------------- 混淆矩阵可视化 --------------------------
def plot_confusion_matrix(model, loader, device, class_names, save_path):
    model.eval()
    all_preds = []
    all_labels = []
    with torch.no_grad():
        for pc_batch, label_batch in loader:
            pc_batch = pc_batch.to(device)
            outputs = model(pc_batch)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(label_batch.numpy())

    cm = confusion_matrix(all_labels, all_preds)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names)
    plt.xlabel('Predicted Class')
    plt.ylabel('True Class')
    plt.title('Tree Species Classification Confusion Matrix (Test Set)')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.show()

    class_acc = 100 * cm.diagonal() / cm.sum(axis=1)
    print("\n测试集各类别识别准确率：")
    for i, cls in enumerate(class_names):
        print(f"{cls}：{class_acc[i]:.2f}%")


# -------------------------- 主训练流程 --------------------------
if __name__ == '__main__':
    ROOT_DIR = r""
    BATCH_SIZE = 16
    NUM_EPOCHS = 200
    LEARNING_RATE = 0.001
    WEIGHT_DECAY = 5e-4
    TRAIN_RATIO, VAL_RATIO, TEST_RATIO = 0.8, 0.1, 0.1
    early_stopping_patience = 15

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    if torch.cuda.is_available():
        print(f"训练设备：{device} | GPU型号：{torch.cuda.get_device_name(0)}")

    # 加载数据集
    full_dataset = TreePointCloudDataset(ROOT_DIR, split="all")
    total_size = len(full_dataset)
    train_size, val_size = int(total_size*TRAIN_RATIO), int(total_size*VAL_RATIO)
    test_size = total_size - train_size - val_size
    train_dataset, val_dataset, test_dataset = random_split(full_dataset, [train_size, val_size, test_size])
    train_dataset.dataset.split, val_dataset.dataset.split, test_dataset.dataset.split = "train", "val", "test"

    # 数据加载器
    train_loader = DataLoader(train_dataset, BATCH_SIZE, shuffle=True, num_workers=2, pin_memory=True)
    val_loader = DataLoader(val_dataset, BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)
    test_loader = DataLoader(test_dataset, BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)

    print(f"\n数据集规模：总样本={total_size} | 训练={train_size} | 验证={val_size} | 测试={test_size}")
    print("="*60)

    # 模型初始化
    model = PointNet2Cls(num_class=5).to(device)
    criterion = nn.NLLLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'max', 0.5, 5)

    best_val_acc = 0.0
    early_stopping_counter = 0
    # 模型保存路径（指定文件夹）
    MODEL_PATH = os.path.join(SAVE_DIR, "pointnet2_tree_best.pth")

    # 训练循环
    for epoch in range(NUM_EPOCHS):
        print(f"\n[Epoch {epoch+1}/{NUM_EPOCHS}]")
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step(val_acc)

        print(f"训练集：损失={train_loss:.4f} | 准确率={train_acc:.2f}%")
        print(f"验证集：损失={val_loss:.4f} | 准确率={val_acc:.2f}%")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), MODEL_PATH)
            print(f"模型已保存至：{MODEL_PATH}")
            early_stopping_counter = 0
        else:
            early_stopping_counter += 1
            print(f"早停计数：{early_stopping_counter}/{early_stopping_patience}")
            if early_stopping_counter >= early_stopping_patience:
                print(f"\n训练终止：连续{early_stopping_patience}轮无提升")
                break
        print("-"*60)

    # 测试集评估
    print(f"\n训练完成 | 最优验证准确率：{best_val_acc:.2f}%")
    model.load_state_dict(torch.load(MODEL_PATH))
    test_loss, test_acc = test_model(model, test_loader, criterion, device)
    print(f"\n最终测试集性能：损失={test_loss:.4f} | 准确率={test_acc:.2f}%")

    # 🔥 混淆矩阵保存路径（指定文件夹）
    CM_PATH = os.path.join(SAVE_DIR, "混淆矩阵.png")
    print(f"\n正在生成混淆矩阵，保存至：{CM_PATH}")
    class_names = ["木樨", "悬铃木", "雪松", "樟树", "紫薇树"]
    plot_confusion_matrix(model, test_loader, device, class_names, CM_PATH)

    print("\n全部任务完成！")
    print(f"最优模型：{MODEL_PATH}")
    print(f"混淆矩阵：{CM_PATH}")
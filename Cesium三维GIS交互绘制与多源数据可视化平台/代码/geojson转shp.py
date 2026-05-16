import geopandas #地理数据处理工具库
import warnings

#消除无效警告
warnings.filterwarnings('ignore')

# 读取geojson文件
file_path=r"输入geojson文件"
gdf=geopandas.read_file(file_path)#gdf=GeoDataFrame（地理数据框）

#过滤无效几何
gdf=gdf[gdf.is_valid]          #保留所有几何结构合法的图形
gdf=gdf[~gdf.geometry.is_empty]#保留非空的图形

#按几何类型拆分
point_gdf=gdf[gdf.geom_type=="Point"]    #点
line_gdf=gdf[gdf.geom_type=="LineString"]#线
polygon_gdf=gdf[gdf.geom_type=="Polygon"]#面

#分别保存为SHP文件
#导出点
if not point_gdf.empty:
    point_gdf.to_file(r"输出路径(点.shp)",driver="ESRI Shapefile",encoding='utf-8')
    print("点文件导出成功：点.shp")

#导出线
if not line_gdf.empty:
    line_gdf.to_file(r"输出路径(线.shp)",driver="ESRI Shapefile",encoding='utf-8')
    print("线文件导出成功：线.shp")

#导出面
if not polygon_gdf.empty:
    polygon_gdf=polygon_gdf[polygon_gdf.area>1e-9]
    polygon_gdf.to_file(r"输出路径(面.shp)",driver="ESRI Shapefile",encoding='utf-8')
    print("面文件导出成功：面.shp")


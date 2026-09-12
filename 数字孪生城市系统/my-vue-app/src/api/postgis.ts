import request from './request'

export interface Road {
    osmId: string | null
    code: number | null
    fclass: string | null
    name: string | null
    ref: string | null
    oneway: string | null
    maxspeed: number | null
    layer: number | null
    bridge: string | null
    tunnel: string | null
}

export interface PostRoadDTO extends Road {
    coordinates: [number, number][] | null
}

export interface PageResult<T> {
    records: T[]
    total: number
    size: number
    current: number
    pages: number
}

//分页查询
export function getRoadPage(pageNum: number, pageSize: number, keyword?: String, fclass?: String) {
    return request.get<PageResult<Road>>('/roads/list', {
        params: { pageNum, pageSize, keyword, fclass },
    })
}
export function postRoad(road: PostRoadDTO) {
    return request.post<PostRoadDTO>('/roads/post', road)
}

export function putRoad(road: Road) {
    return request.put<Road>('/roads/put', road)
}

export function deleteRoad(osmId: string) {
    return request.delete<Road>(`/roads/delete/${osmId}`)
}



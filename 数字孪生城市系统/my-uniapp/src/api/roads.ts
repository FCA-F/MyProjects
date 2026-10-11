import { request } from './request'

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

export interface RoadPage {
    records: Road[]
    total: number
    size: number
    current: number
    pages: number
}

export function getRoadPage(pageNum: number, pageSize: number, keyword?: string) {
    const data: Record<string, unknown> = { pageNum, pageSize }
    if (keyword?.trim()) {
        data.keyword = keyword.trim()
    }

    return request<RoadPage>({
        url: '/roads/list',
        method: 'GET',
        data,
    })
}

export function updateRoad(road: Road) {
    return request<void>({
        url: '/roads/put',
        method: 'PUT',
        data: road as unknown as Record<string, unknown>,
    })
}

export function deleteRoad(osmId: string) {
    return request<void>({
        url: `/roads/delete/${encodeURIComponent(osmId)}`,
        method: 'DELETE',
    })
}

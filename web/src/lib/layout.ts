import type { Node, Edge } from '@xyflow/react'

/**
 * Non-destructive tidy: aligns nodes that are roughly on the same X (columns)
 * or Y (rows) to a shared coordinate, then spaces columns/rows evenly using the
 * graph's own median gap. Preserves the manual hierarchy: relative order on
 * both axes is never changed, nodes only snap into alignment.
 */

const COL_THRESHOLD = 70 // px: nodes within this X distance share a column
const ROW_THRESHOLD = 55 // px: nodes within this Y distance share a row

interface AxisClusters {
  clusterOf: Map<string, number>
  centers: number[] // average original position per cluster, in ascending order
}

function clusterAxis(values: { id: string; v: number }[], threshold: number): AxisClusters {
  const sorted = [...values].sort((a, b) => a.v - b.v)
  const clusterOf = new Map<string, number>()
  const sums: number[] = []
  const counts: number[] = []
  let ci = -1
  let prev = Infinity
  for (const { id, v } of sorted) {
    if (ci < 0 || v - prev > threshold) {
      ci++
      sums[ci] = 0
      counts[ci] = 0
    }
    clusterOf.set(id, ci)
    sums[ci] += v
    counts[ci] += 1
    prev = v
  }
  const centers = sums.map((s, i) => s / counts[i])
  return { clusterOf, centers }
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Uniform target coordinate per cluster, anchored at the first cluster's center. */
function evenTargets(centers: number[], fallbackStep: number): number[] {
  if (centers.length <= 1) return centers
  const gaps: number[] = []
  for (let i = 1; i < centers.length; i++) gaps.push(centers[i] - centers[i - 1])
  const step = median(gaps) || fallbackStep
  return centers.map((_, i) => Math.round(centers[0] + i * step))
}

export function alignNodes(nodes: Node[], _edges: Edge[]): Node[] {
  if (nodes.length < 2) return nodes

  const cols = clusterAxis(nodes.map((n) => ({ id: n.id, v: n.position.x })), COL_THRESHOLD)
  const rows = clusterAxis(nodes.map((n) => ({ id: n.id, v: n.position.y })), ROW_THRESHOLD)

  const colX = evenTargets(cols.centers, 220)
  const rowY = evenTargets(rows.centers, 130)

  // avoid stacking two nodes onto the exact same cell
  const taken = new Map<string, number>()

  return nodes.map((n) => {
    const ci = cols.clusterOf.get(n.id) ?? 0
    const ri = rows.clusterOf.get(n.id) ?? 0
    const key = `${ci}:${ri}`
    const dup = taken.get(key) ?? 0
    taken.set(key, dup + 1)
    return {
      ...n,
      position: { x: colX[ci] + dup * 52, y: rowY[ri] + dup * 8 },
    }
  })
}

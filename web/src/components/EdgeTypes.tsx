import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { useTokens } from '../styles/themes'
import { useBoardStore } from '../store'

export function CustomEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps) {
  const t = useTokens()
  const edgeStyle = useBoardStore((s) => s.edgeStyle)

  const [edgePath, labelX, labelY] =
    edgeStyle === 'straight'
      ? getStraightPath({ sourceX, sourceY, targetX, targetY })
      : edgeStyle === 'step'
        ? getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 2 })
        : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const state = (data?.state as string) ?? 'hypothetical'
  const style = t.edgeColors[state] ?? t.edgeColors.hypothetical
  const label = (data?.label as string) ?? ''
  const showLabel = state !== 'confirmed' || label
  const stroke = selected ? t.accent : style.stroke

  return (
    <>
      {/* soft glow underlay */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected ? 6 : 4,
          strokeDasharray: style.strokeDasharray,
          opacity: 0.16,
          filter: 'blur(1px)',
        }}
      />
      <BaseEdge
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected ? 1.8 : 1.3,
          strokeDasharray: style.strokeDasharray,
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: t.theme === 'dark' ? 'rgba(10,11,15,0.9)' : 'rgba(246,244,238,0.95)',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${stroke}`,
              borderRadius: 6,
              color: stroke,
              fontSize: 9,
              fontFamily: t.fontMono,
              fontWeight: 500,
              padding: '2px 7px',
              pointerEvents: 'all',
              whiteSpace: 'nowrap',
              letterSpacing: 0.3,
              boxShadow: selected ? `0 0 12px -2px ${stroke}` : 'none',
            }}
            className="nodrag nopan"
          >
            {state !== 'confirmed' ? `[${state}]` : ''}{label ? ` ${label}` : ''}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes = { custom: CustomEdge }

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import { LogIn, Box, AlertTriangle } from 'lucide-react';

// ─── Colors and Dimensions ──────────────────────────────────────────────────────
const MAX_NODES = 60;
// Used as a bounding box for horizontal layer packing
const DAGRE_NODE_SIZE = 140;

const palette = (n) => {
  if (n.is_entry)             return { dot: '#37fe11' };
  if (n.is_orphan)            return { dot: '#4a5568' };
  const i = n.importance || 0;
  if (i > 0.55) return { dot: '#ffb4ab' };
  return               { dot: '#00d1ff' };
};

// ─── Custom Node (Stitch Mockup Reflection - Pure Inline Styles) ──────────────
const CustomNode = React.memo(({ data }) => {
  const isHighRisk = (data.importance || 0) > 0.55 && !data.is_entry;
  const isEntry = data.is_entry;
  const label = data.label || data.id?.split('/').pop();

  const handles = (
    <>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </>
  );

  const containerStyle = { 
    width: DAGRE_NODE_SIZE, height: DAGRE_NODE_SIZE, 
    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  };

  const nodeBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    backdropFilter: 'blur(12px)', backgroundColor: 'rgba(16, 23, 42, 0.7)',
    borderWidth: '2px', borderStyle: 'solid', 
  };

  const labelBase = {
    position: 'absolute', bottom: '-40px', whiteSpace: 'nowrap', backgroundColor: '#1d2026', 
    padding: '4px 10px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', 
    letterSpacing: '0.05em', borderWidth: '1px', borderStyle: 'solid', borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)', pointerEvents: 'none'
  };
  
  if (isEntry) {
    return (
      <div style={containerStyle}>
        {handles}
        <div style={{ ...nodeBase, width: '86px', height: '86px', borderRadius: '50%', borderColor: 'var(--tertiary)', boxShadow: '0 0 15px rgba(55,254,17,0.2)' }}>
          <LogIn color="var(--tertiary)" size={36} />
          <div style={{ ...labelBase, color: 'var(--tertiary)', borderColor: 'rgba(55, 254, 17, 0.3)' }}>
            Entry: {label}
          </div>
        </div>
      </div>
    );
  }

  if (isHighRisk) {
    return (
      <div style={containerStyle}>
        {handles}
        <div style={{ ...nodeBase, width: '110px', height: '110px', borderRadius: '50%', borderColor: 'var(--error)', boxShadow: '0 0 30px rgba(255,180,171,0.2)' }}>
          <AlertTriangle color="var(--error)" size={52} />
          <div style={{ ...labelBase, color: 'var(--error)', borderColor: 'rgba(255,180,171,0.5)', backgroundColor: 'rgba(60,10,10,0.8)' }}>
            RISK: {label}
          </div>
        </div>
      </div>
    );
  }

  // Default Module
  return (
    <div style={containerStyle}>
      {handles}
      <div style={{ ...nodeBase, width: '72px', height: '72px', borderRadius: '8px', borderColor: 'var(--primary-accent)' }}>
        <Box color="var(--primary-accent)" size={32} />
        <div style={{ ...labelBase, color: '#e1e2eb', borderColor: 'rgba(0, 209, 255, 0.3)' }}>
          {label}
        </div>
      </div>
    </div>
  );
});

const nodeTypes = { custom: CustomNode };

// ─── ELK Flowchart Layout Engine ───────────────────────────────────────────────
const elk = new ELK();

async function getElkLayout(nodesData, edgesData) {
  if (nodesData.length === 0) return [];

  const graph = {
    id: "root",
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      // Widen the horizontal graph layers so it stretches completely across monitors
      'elk.layered.spacing.nodeNodeBetweenLayers': '300',
      // Compress vertical spacing significantly
      'elk.spacing.nodeNode': '20',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.edgeRouting': 'SPLINES',
    },
    children: nodesData.map(n => ({ id: n.id, width: DAGRE_NODE_SIZE, height: DAGRE_NODE_SIZE })),
    edges: edgesData.map((e, i) => ({ id: `e${i}`, sources: [e.source], targets: [e.target] }))
  };

  const layout = await elk.layout(graph);
  
  return nodesData.map(n => {
    const elkn = layout.children.find(c => c.id === n.id);
    return {
      x: elkn.x - DAGRE_NODE_SIZE / 2,
      y: elkn.y - DAGRE_NODE_SIZE / 2,
    };
  });
}

// ─── Build React Flow Elements (Async) ────────────────────────────────────────
async function buildElementsAsync(graphData, showOrphans) {
  if (!graphData?.nodes) return { nodes: [], edges: [] };

  let visNodes = showOrphans ? graphData.nodes : graphData.nodes.filter(n => !n.is_orphan);

  if (visNodes.length > MAX_NODES) {
    const entries = visNodes.filter(n => n.is_entry);
    const rest = visNodes.filter(n => !n.is_entry)
                         .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                         .slice(0, MAX_NODES - entries.length);
    visNodes = [...entries, ...rest];
  }

  const visIds = new Set(visNodes.map(n => n.id));
  const visEdges = (graphData.edges || []).filter(e => visIds.has(e.source) && visIds.has(e.target) && e.source !== e.target);

  // Group by disconnected components
  const adjacency = {};
  visNodes.forEach(n => { adjacency[n.id] = []; });
  visEdges.forEach(e => {
    adjacency[e.source].push(e.target);
    adjacency[e.target].push(e.source);
  });

  const visited = new Set();
  const components = [];

  visNodes.forEach(n => {
    if (!visited.has(n.id)) {
      const comp = [];
      const queue = [n.id];
      visited.add(n.id);

      while (queue.length > 0) {
        const curr = queue.shift();
        comp.push(curr);
        adjacency[curr].forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
      components.push(comp);
    }
  });

  components.sort((a, b) => b.length - a.length);

  const gridNodes = [];
  const finalPositions = {};
  
  let currentX = 0;
  let currentY = 0;
  let rowMaxHeight = 0;

  for (const comp of components) {
    if (comp.length === 1) {
      gridNodes.push(visNodes.find(n => n.id === comp[0]));
    } else {
      const subNodes = comp.map(id => visNodes.find(n => n.id === id)).filter(Boolean);
      const subSet = new Set(comp);
      const subEdges = visEdges.filter(e => subSet.has(e.source) && subSet.has(e.target));

      // Asynchronous clustered layout calculation
      const subPositions = await getElkLayout(subNodes, subEdges);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      subPositions.forEach(p => {
        if(p.x < minX) minX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.x > maxX) maxX = p.x;
        if(p.y > maxY) maxY = p.y;
      });
      
      const width = (maxX - minX) + DAGRE_NODE_SIZE;
      const height = (maxY - minY) + DAGRE_NODE_SIZE;

      if (currentX + width > 1400 && currentX > 0) {
        currentX = 0;
        currentY += rowMaxHeight + 140;
        rowMaxHeight = 0;
      }

      subPositions.forEach((p, i) => {
        finalPositions[subNodes[i].id] = {
          x: (p.x - minX) + currentX,
          y: (p.y - minY) + currentY
        };
      });

      currentX += width + 140;
      if (height > rowMaxHeight) rowMaxHeight = height;
    }
  }

  // Grid pack isolates
  const gridStartY = Math.max(currentY + rowMaxHeight + 150, 150);
  gridNodes.forEach((n, i) => {
    finalPositions[n.id] = {
      x: (i % 8) * 140,
      y: gridStartY + Math.floor(i / 8) * 120
    };
  });

  // Flow Nodes Map
  const rfNodes = visNodes.map((n) => ({
    id: n.id,
    type: 'custom',
    width: DAGRE_NODE_SIZE,
    height: DAGRE_NODE_SIZE,
    position: { x: finalPositions[n.id]?.x ?? 0, y: finalPositions[n.id]?.y ?? 0 },
    data: { ...n },
    draggable: true,
  }));

  // 6. Build React Flow edges with importance-based styling
  const nodeMap = {};
  graphData.nodes.forEach(n => { nodeMap[n.id] = n; });

  const rfEdges = visEdges.map((e, i) => {
    const imp    = Math.max(nodeMap[e.source]?.importance || 0, nodeMap[e.target]?.importance || 0);
    const isHigh = imp > 0.55;
    const isMed  = imp > 0.3;

    const stroke = isHigh ? 'rgba(239,68,68,0.65)'
      : isMed              ? 'rgba(245,158,11,0.6)'
      : 'rgba(99,120,255,0.4)';

    return {
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: isHigh,
      style: { stroke, strokeWidth: isHigh ? 2.2 : 1.4, strokeDasharray: '4 4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
    };
  });

  return { nodes: rfNodes, edges: rfEdges };
}

// ─── Inner Graph (needs ReactFlow context for fitView) ─────────────────────────
function InnerGraph({ graphData, onNodeSelect, selectedNodeId, searchHighlight }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showOrphans, setShowOrphans] = useState(false);
  const { fitView, setCenter, getNode } = useReactFlow();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!graphData) return;
    buildElementsAsync(graphData, showOrphans).then(({ nodes: rn, edges: re }) => {
      setNodes(rn);
      setEdges(re);
      fittedRef.current = false;
    });
  }, [graphData, showOrphans, setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length && !fittedRef.current) {
      fittedRef.current = true;
      setTimeout(() => fitView({ padding: 0.1, duration: 800 }), 120);
    }
  }, [nodes, fitView]);

  // Search highlight & selection
  useEffect(() => {
    if (!graphData) return;

    let highlightNodeIds = null;

    if (searchHighlight?.length) {
      highlightNodeIds = new Set(searchHighlight);
    } else if (selectedNodeId) {
      highlightNodeIds = new Set([selectedNodeId]);
      (graphData.edges || []).forEach(e => {
        if (e.source === selectedNodeId || e.target === selectedNodeId) {
          highlightNodeIds.add(e.source);
          highlightNodeIds.add(e.target);
        }
      });
      
      const n = getNode(selectedNodeId);
      if (n && n.position) {
        setTimeout(() => setCenter(n.position.x + DAGRE_NODE_SIZE / 2, n.position.y + DAGRE_NODE_SIZE / 2, { zoom: 1.2, duration: 800 }), 50);
      }
    }

    setNodes(prev => prev.map(n => ({
      ...n,
      selected: n.id === selectedNodeId,
      style: {
        opacity: highlightNodeIds ? (highlightNodeIds.has(n.id) ? 1 : 0.08) : 1,
        transition: 'opacity 0.3s ease',
      },
    })));

    setEdges(prev => prev.map(e => {
      const isHighlighted = highlightNodeIds 
        ? (searchHighlight?.length 
            ? highlightNodeIds.has(e.source) && highlightNodeIds.has(e.target)
            : (e.source === selectedNodeId || e.target === selectedNodeId))
        : true;
      return {
        ...e,
        style: {
          ...e.style,
          opacity: isHighlighted ? 1 : 0.08,
          transition: 'opacity 0.3s ease',
        }
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, searchHighlight, setNodes, setEdges, graphData, setCenter, getNode]);

  const onNodeClick = useCallback((_, node) => onNodeSelect(node.data), [onNodeSelect]);
  const miniColor   = useCallback((n) => palette(n.data || {}).dot, []);

  const orphanCount     = graphData?.nodes?.filter(n => n.is_orphan).length || 0;
  const connectedCount  = graphData?.nodes?.filter(n => !n.is_orphan).length || 0;
  const displayedCount  = Math.min(connectedCount, MAX_NODES);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.04}
      maxZoom={4}
      defaultEdgeOptions={{ type: 'smoothstep' }}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(99,120,255,0.07)" />

      <Controls style={{
        background: '#111827', border: '1px solid rgba(99,120,255,0.2)',
        borderRadius: 10, overflow: 'hidden',
      }} />

      <MiniMap
        nodeColor={miniColor}
        style={{
          background: '#080d18', border: '1px solid rgba(99,120,255,0.2)',
          borderRadius: 10,
        }}
        maskColor="rgba(4,7,15,0.8)"
        zoomable pannable
      />

      {/* Top-right toolbar */}
      <Panel position="top-right" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Node count badge */}
        <div style={{
          padding: '5px 11px',
          background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,120,255,0.18)',
          borderRadius: 8, fontSize: 11.5, color: '#8892b0', fontWeight: 500,
        }}>
          {displayedCount} nodes · {edges.length} edges
        </div>

        {/* Orphan toggle */}
        {orphanCount > 0 && (
          <button onClick={() => setShowOrphans(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 11px',
            background: showOrphans ? 'rgba(74,85,104,0.25)' : 'rgba(10,15,30,0.92)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${showOrphans ? 'rgba(100,116,139,0.5)' : 'rgba(99,120,255,0.18)'}`,
            borderRadius: 8, color: showOrphans ? '#94a3b8' : '#8892b0',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4a5568', display: 'inline-block' }} />
            {showOrphans ? 'Hide' : 'Show'} orphans ({orphanCount})
          </button>
        )}

        {/* Fit */}
        <button onClick={() => fitView({ padding: 0.1, duration: 600 })} style={{
          padding: '5px 11px',
          background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,120,255,0.18)',
          borderRadius: 8, color: '#8892b0',
          fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        }}>
          ⊞ Fit
        </button>
      </Panel>
    </ReactFlow>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ArchitectureGraph(props) {
  return (
    <ReactFlowProvider>
      <InnerGraph {...props} />
    </ReactFlowProvider>
  );
}

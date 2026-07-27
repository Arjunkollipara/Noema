import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { decayToVisual } from '../utils/decay';

export default function Graph({ nodes, edges, onNodeClick, selectedNodeId }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = viewport.width;
    const height = viewport.height;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    if (nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1e1e2e')
        .attr('font-size', '14px')
        .attr('letter-spacing', '0.05em')
        .text('your mind is a blank canvas - click Think to begin');
      return;
    }

    const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));
    const nodeData = Array.from(nodeMap.values());
    const linkData = edges
      .filter(e => nodeMap.has(e.source_id) && nodeMap.has(e.target_id))
      .map(e => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        edge_type: e.edge_type,
      }));

    const stageMap = new Map(nodeData.map(n => [n.id, n.cognitive_stage || 1]));

    const defs = svg.append('defs');

    const makeGlow = (id, blur) => {
      const filter = defs.append('filter').attr('id', id);
      filter.append('feGaussianBlur').attr('stdDeviation', blur).attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    };

    makeGlow('glow-warm', 4);
    makeGlow('glow-cool', 3);
    makeGlow('glow-selected', 8);

    defs.append('style').text(`
      @keyframes nodePulse {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 1; }
      }
      @keyframes nodeFloat {
        0%, 100% { opacity: 0.35; transform: scale(0.96); }
        50% { opacity: 0.55; transform: scale(1.04); }
      }
    `);

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', event => g.attr('transform', event.transform));

    svg.call(zoom);
    svg.on('click', () => onNodeClick(null));

    const getStage = value => {
      if (typeof value === 'object' && value?.id) {
        return stageMap.get(value.id) || 1;
      }
      return stageMap.get(value) || 1;
    };

    const link = g.append('g')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', d => {
        const stage = getStage(d.target);
        if (stage >= 4) return '#f59e0b';
        if (stage >= 3) return '#2dd4bf';
        if (stage >= 2) return '#4a4a6e';
        return '#1e1e2e';
      })
      .attr('stroke-width', d => {
        const stage = getStage(d.target);
        if (stage >= 4) return 2.5;
        if (stage >= 3) return 1.8;
        if (stage >= 2) return 1.2;
        return 0.8;
      })
      .attr('stroke-opacity', d => {
        const stage = getStage(d.target);
        if (stage >= 4) return 0.8;
        if (stage >= 3) return 0.6;
        if (stage >= 2) return 0.4;
        return 0.18;
      })
      .attr('stroke-dasharray', d => (getStage(d.target) <= 1 ? '3 4' : 'none'));

    const node = g.append('g')
      .selectAll('g')
      .data(nodeData)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    node.append('circle')
      .attr('r', d => decayToVisual(d.decay_score).radius + 10)
      .attr('fill', 'none')
      .attr('stroke', d => (d.id === selectedNodeId ? '#f59e0b' : 'none'))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35)
      .attr('filter', d => (d.id === selectedNodeId ? 'url(#glow-selected)' : 'none'));

    node.append('circle')
      .attr('r', d => (d.is_anchored === 0 ? 6 : decayToVisual(d.decay_score).radius))
      .attr('fill', d => {
        if (d.is_anchored === 0) return 'transparent';
        const stage = d.cognitive_stage || 1;
        if (stage >= 4) return '#f59e0b';
        if (stage >= 3) return '#2dd4bf';
        if (stage >= 2) return '#6366f1';
        return decayToVisual(d.decay_score).colour;
      })
      .attr('opacity', d => (d.is_anchored === 0 ? 0 : decayToVisual(d.decay_score).opacity))
      .attr('stroke', d => {
        if (d.is_anchored === 0) {
          if (d.node_origin === 'blocking') return '#ef4444';
          if (d.node_origin === 'expected') return '#a78bfa';
          return '#2dd4bf';
        }
        return 'none';
      })
      .attr('stroke-width', d => (d.is_anchored === 0 ? 1 : 0))
      .attr('stroke-dasharray', d => (d.is_anchored === 0 ? '3 3' : 'none'))
      .attr('filter', d => {
        if (d.is_anchored === 0) return 'none';
        const stage = d.cognitive_stage || 1;
        return stage >= 3 ? 'url(#glow-warm)' : 'url(#glow-cool)';
      })
      .style('animation', d => {
        if (d.is_anchored === 0) return 'nodeFloat 3s ease-in-out infinite';
        return (d.cognitive_stage || 1) >= 3 ? 'nodePulse 3s ease-in-out infinite' : 'none';
      });

    node.append('text')
      .text(d => (d.title.length > 22 ? `${d.title.slice(0, 22)}...` : d.title))
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        const r = d.is_anchored === 0 ? 6 : decayToVisual(d.decay_score).radius;
        return r + 14;
      })
      .attr('fill', d => {
        if (d.is_anchored === 0) return '#3a3a5e';
        const stage = d.cognitive_stage || 1;
        if (stage >= 4) return '#f59e0b';
        if (stage >= 3) return '#2dd4bf';
        return '#6b7280';
      })
      .attr('font-size', d => ((d.cognitive_stage || 1) >= 3 ? '11px' : '10px'))
      .attr('font-weight', d => ((d.cognitive_stage || 1) >= 3 ? '500' : '400'))
      .attr('pointer-events', 'none')
      .attr('letter-spacing', '0.02em');

    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.15).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
      });

    node.call(drag);

    const orbitRadius = stage => {
      const s = Math.max(1, Math.min(5, stage || 1));
      const orbits = { 1: 0.42, 2: 0.32, 3: 0.22, 4: 0.13, 5: 0.06 };
      return (orbits[s] || 0.42) * Math.min(width, height);
    };

    const chargeForStage = stage => {
      const charges = { 1: -280, 2: -220, 3: -160, 4: -100, 5: -60 };
      return charges[stage || 1] || -280;
    };

    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData)
        .id(d => d.id)
        .distance(d => {
          const targetStage = getStage(d.target);
          const distances = { 1: 180, 2: 140, 3: 100, 4: 70, 5: 45 };
          return distances[targetStage] || 180;
        })
        .strength(d => {
          const targetStage = getStage(d.target);
          return targetStage >= 4 ? 0.8 : targetStage >= 3 ? 0.6 : 0.3;
        }))
      .force('charge', d3.forceManyBody().strength(d => chargeForStage(d.cognitive_stage)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        const r = d.is_anchored === 0 ? 6 : decayToVisual(d.decay_score).radius;
        return r + 18;
      }))
      .force('depth', d3.forceRadial(d => orbitRadius(d.cognitive_stage), width / 2, height / 2).strength(0.12))
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      })
      .on('end', () => simulation.stop());

    simulationRef.current = simulation;

    return () => simulation.stop();
  }, [nodes, edges, selectedNodeId, viewport, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={viewport.width}
      height={viewport.height}
      style={{
        display: 'block',
        background: 'radial-gradient(circle at center, #11111a 0%, #07070a 55%, #060608 100%)',
      }}
    />
  );
}

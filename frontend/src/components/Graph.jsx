import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { decayToVisual } from '../utils/decay';

export default function Graph({ nodes, edges, onNodeClick, selectedNodeId }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  const width = window.innerWidth;
  const height = window.innerHeight;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#2a2a3e')
        .attr('font-size', '16px')
        .text('Your knowledge graph is empty. Create your first node.');
      return;
    }

    // Build D3 node and link data
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));
    const linkData = edges
      .filter(e => nodeMap.has(e.source_id) && nodeMap.has(e.target_id))
      .map(e => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        edge_type: e.edge_type,
      }));
    const nodeData = Array.from(nodeMap.values());

    // Defs for glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Container group for zoom
    const g = svg.append('g');

    // Zoom behaviour
    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#2a2a3e')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Draw node groups
    const node = g.append('g')
      .selectAll('g')
      .data(nodeData)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Outer glow ring for selected node
    node.append('circle')
      .attr('r', d => {
        const { radius } = decayToVisual(d.decay_score);
        return radius + 6;
      })
      .attr('fill', 'none')
      .attr('stroke', d => d.id === selectedNodeId ? '#f59e0b' : 'none')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5);

    // Main node circle
    node.append('circle')
      .attr('r', d => decayToVisual(d.decay_score).radius)
      .attr('fill', d => decayToVisual(d.decay_score).colour)
      .attr('opacity', d => decayToVisual(d.decay_score).opacity)
      .attr('filter', 'url(#glow)');

    // Node label
    node.append('text')
      .text(d => d.title.length > 20 ? d.title.slice(0, 20) + '...' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', d => decayToVisual(d.decay_score).radius + 14)
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px')
      .attr('pointer-events', 'none');

    // Drag behaviour
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulationRef.current.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Click on background deselects
    svg.on('click', () => onNodeClick(null));

    // Force simulation
    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData)
        .id(d => d.id)
        .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => decayToVisual(d.decay_score).radius + 20)
      )
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    simulationRef.current = simulation;

    // Stop simulation after it settles
    simulation.on('end', () => {
      simulation.stop();
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, selectedNodeId, width, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: 'block', background: '#0a0a0f' }}
    />
  );
}

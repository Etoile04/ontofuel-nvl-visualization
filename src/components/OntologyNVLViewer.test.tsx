/**
 * OntologyNVLViewer 组件测试
 * 
 * 测试用例：
 * 1. 组件正常渲染
 * 2. 数据加载（props 和 URL）
 * 3. 交互功能（点击节点）
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OntologyNVLViewer from './OntologyNVLViewer';
import type { Node, Relationship } from '../types/nvl';

// Mock InteractiveNvlWrapper from @neo4j-nvl/react
jest.mock('@neo4j-nvl/react', () => ({
  InteractiveNvlWrapper: ({ nodes, rels, mouseEventCallbacks }: any) => (
    <div data-testid="nvl-wrapper">
      <div data-testid="node-count">{nodes.length} nodes</div>
      <div data-testid="rel-count">{rels.length} relationships</div>
      {nodes.map((node: Node) => (
        <div
          key={node.id}
          data-testid={`node-${node.id}`}
          onClick={() => mouseEventCallbacks?.onNodeClick?.(node)}
          onDoubleClick={() => mouseEventCallbacks?.onNodeDoubleClick?.(node)}
        >
          {node.name || node.id}
        </div>
      ))}
      {rels.map((rel: Relationship, idx: number) => (
        <div
          key={idx}
          data-testid={`rel-${idx}`}
          onClick={() => mouseEventCallbacks?.onRelationshipClick?.(rel)}
        >
          {rel.type}
        </div>
      ))}
    </div>
  )
}));

describe('OntologyNVLViewer', () => {
  // 测试数据
  const mockNodes: Node[] = [
    {
      id: 'class-1',
      name: 'Material',
      type: 'class',
      label: 'Material',
      uri: 'http://example.org/Material'
    },
    {
      id: 'individual-1',
      name: 'Steel',
      type: 'individual',
      class: 'Material',
      label: 'Steel'
    },
    {
      id: 'class-2',
      name: 'Property',
      type: 'class',
      label: 'Property'
    }
  ];

  const mockRelationships: Relationship[] = [
    {
      id: 'rel-1',
      from: 'class-1',
      to: 'class-2',
      type: 'HAS_PROPERTY'
    },
    {
      id: 'rel-2',
      from: 'individual-1',
      to: 'class-1',
      type: 'INSTANCE_OF'
    }
  ];

  const mockData = {
    nodes: mockNodes,
    relationships: mockRelationships
  };

  // 清除所有 mock
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ==================== 测试用例 1: 组件正常渲染 ====================
  describe('正常渲染', () => {
    test('应该正确渲染组件而不崩溃', () => {
      const { container } = render(
        <OntologyNVLViewer data={mockData} />
      );

      // 验证容器存在
      expect(container.querySelector('.ontology-nvl-viewer')).toBeInTheDocument();
    });

    test('应该渲染工具栏元素', () => {
      render(<OntologyNVLViewer data={mockData} />);

      // 验证搜索框
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();

      // 验证布局选择器
      expect(screen.getByRole('combobox')).toBeInTheDocument();

      // 验证导出按钮（下拉菜单形式）
      expect(screen.getByLabelText('Export menu')).toBeInTheDocument();
    });

    test('应该应用自定义尺寸', () => {
      const { container } = render(
        <OntologyNVLViewer 
          data={mockData} 
          width="800px" 
          height="400px" 
        />
      );

      const viewer = container.querySelector('.ontology-nvl-viewer');
      expect(viewer).toHaveStyle({ width: '800px', height: '400px' });
    });

    test('应该使用默认布局（forceDirected）', () => {
      render(<OntologyNVLViewer data={mockData} />);

      const layoutSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(layoutSelect.value).toBe('forceDirected');
    });

    test('应该使用指定的初始布局', () => {
      render(<OntologyNVLViewer data={mockData} initialLayout="hierarchical" />);

      const layoutSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(layoutSelect.value).toBe('hierarchical');
    });
  });

  // ==================== 测试用例 2: 数据加载 ====================
  describe('数据加载', () => {
    test('应该从 props 加载数据', async () => {
      render(<OntologyNVLViewer data={mockData} />);

      // 等待数据加载完成
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
      });

      // 验证节点数量
      expect(screen.getByTestId('node-count')).toHaveTextContent('3 nodes');

      // 验证关系数量
      expect(screen.getByTestId('rel-count')).toHaveTextContent('2 relationships');

      // 验证节点渲染
      expect(screen.getByTestId('node-class-1')).toHaveTextContent('Material');
      expect(screen.getByTestId('node-individual-1')).toHaveTextContent('Steel');
    });

    test('应该从 URL 加载数据', async () => {
      // Mock fetch 响应（组件使用 text() + JSON.parse）
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
        text: async () => JSON.stringify(mockData)
      });

      render(<OntologyNVLViewer dataUrl="http://example.org/data.json" />);

      // 验证 fetch 被调用（含 AbortController signal）
      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.org/data.json',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );

      // 等待数据加载完成
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
      });

      // 验证数据正确加载
      expect(screen.getByTestId('node-count')).toHaveTextContent('3 nodes');
    });

    test('应该显示加载状态', () => {
      // Mock 一个永不 resolve 的 fetch
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<OntologyNVLViewer dataUrl="http://example.org/data.json" />);

      // 验证加载指示器
      expect(screen.getByText('Loading ontology data...')).toBeInTheDocument();
    });

    test('应该处理加载错误', async () => {
      // Mock fetch 错误
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<OntologyNVLViewer dataUrl="http://example.org/invalid.json" />);

      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    test('应该处理 HTTP 错误响应', async () => {
      // Mock HTTP 错误
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      render(<OntologyNVLViewer dataUrl="http://example.org/notfound.json" />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/404/)).toBeInTheDocument();
    });

    test('应该在没有 data 和 dataUrl 时显示错误', async () => {
      render(<OntologyNVLViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Either data or dataUrl must be provided/)).toBeInTheDocument();
    });

    test('应该显示统计信息', async () => {
      render(<OntologyNVLViewer data={mockData} />);

      await waitFor(() => {
        expect(screen.getByText('Statistics')).toBeInTheDocument();
      });

      // 验证统计信息
      expect(screen.getByText(/Classes:/)).toBeInTheDocument();
      expect(screen.getByText(/Individuals:/)).toBeInTheDocument();
    });
  });

  // ==================== 测试用例 3: 交互功能 ====================
  describe('交互功能', () => {
    test('应该响应节点点击', async () => {
      const mockOnNodeClick = jest.fn();

      render(
        <OntologyNVLViewer 
          data={mockData} 
          onNodeClick={mockOnNodeClick}
        />
      );

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByTestId('node-class-1')).toBeInTheDocument();
      });

      // 点击节点
      fireEvent.click(screen.getByTestId('node-class-1'));

      // 验证回调被调用
      expect(mockOnNodeClick).toHaveBeenCalledTimes(1);
      expect(mockOnNodeClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'class-1',
          name: 'Material',
          type: 'class'
        })
      );
    });

    test('应该显示节点详情面板', async () => {
      const { container } = render(<OntologyNVLViewer data={mockData} />);

      await waitFor(() => {
        expect(screen.getByTestId('node-class-1')).toBeInTheDocument();
      });

      // 点击节点
      fireEvent.click(screen.getByTestId('node-class-1'));

      // 验证详情面板显示
      await waitFor(() => {
        // 查找详情面板中的 h3 标题
        const nodeDetailsPanel = container.querySelector('.node-details-panel');
        expect(nodeDetailsPanel).toBeInTheDocument();
        
        // 验证标题
        const heading = nodeDetailsPanel?.querySelector('h3');
        expect(heading).toHaveTextContent('Material');
        
        // 验证类型信息
        expect(screen.getByText(/Type:/)).toBeInTheDocument();
      });
    });

    test('应该响应节点双击', async () => {
      const mockOnNodeDoubleClick = jest.fn();

      render(
        <OntologyNVLViewer 
          data={mockData} 
          onNodeDoubleClick={mockOnNodeDoubleClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('node-individual-1')).toBeInTheDocument();
      });

      // 双击节点
      fireEvent.doubleClick(screen.getByTestId('node-individual-1'));

      // 验证回调被调用
      expect(mockOnNodeDoubleClick).toHaveBeenCalledTimes(1);
      expect(mockOnNodeDoubleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'individual-1',
          name: 'Steel',
          type: 'individual'
        })
      );
    });

    test('应该响应关系点击', async () => {
      const mockOnRelationshipClick = jest.fn();

      render(
        <OntologyNVLViewer 
          data={mockData} 
          onRelationshipClick={mockOnRelationshipClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('rel-0')).toBeInTheDocument();
      });

      // 点击关系
      fireEvent.click(screen.getByTestId('rel-0'));

      // 验证回调被调用
      expect(mockOnRelationshipClick).toHaveBeenCalledTimes(1);
      expect(mockOnRelationshipClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HAS_PROPERTY'
        })
      );
    });

    test('应该支持搜索过滤', async () => {
      render(<OntologyNVLViewer data={mockData} />);

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('3 nodes');
      });

      // 输入搜索词
      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'Steel' } });

      // 验证过滤结果（只有 Steel 节点）
      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('1 nodes');
      });

      expect(screen.getByTestId('node-individual-1')).toBeInTheDocument();
      expect(screen.queryByTestId('node-class-1')).not.toBeInTheDocument();
    });

    test('应该支持布局切换', async () => {
      render(<OntologyNVLViewer data={mockData} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const layoutSelect = screen.getByRole('combobox') as HTMLSelectElement;
      
      // 切换到 hierarchical 布局
      fireEvent.change(layoutSelect, { target: { value: 'hierarchical' } });

      expect(layoutSelect.value).toBe('hierarchical');

      // 切换到 circular 布局
      fireEvent.change(layoutSelect, { target: { value: 'circular' } });

      expect(layoutSelect.value).toBe('circular');
    });

    test('应该支持导出 JSON', async () => {
      render(<OntologyNVLViewer data={mockData} />);

      const exportButton = await screen.findByLabelText('Export menu');
      expect(exportButton).toBeInTheDocument();

      // 打开导出菜单
      fireEvent.click(exportButton);

      // 点击 JSON 导出选项
      const jsonExportOption = await screen.findByText('📄 Export as JSON');
      fireEvent.click(jsonExportOption);

      // 验证 URL.createObjectURL 被调用
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('应该处理节点的自定义属性', async () => {
      const customNode: Node = {
        id: 'custom-1',
        name: 'CustomNode',
        type: 'class',
        customProperty: 'customValue',
        anotherProp: 123
      };

      render(
        <OntologyNVLViewer 
          data={{ nodes: [customNode], relationships: [] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('node-custom-1')).toBeInTheDocument();
      });

      // 点击节点
      fireEvent.click(screen.getByTestId('node-custom-1'));

      // 验证自定义属性显示
      await waitFor(() => {
        expect(screen.getByText(/Properties/)).toBeInTheDocument();
      });
    });
  });

  // ==================== 额外测试：边界情况 ====================
  describe('边界情况', () => {
    test('应该处理空数据', async () => {
      render(
        <OntologyNVLViewer 
          data={{ nodes: [], relationships: [] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('0 nodes');
        expect(screen.getByTestId('rel-count')).toHaveTextContent('0 relationships');
      });
    });

    test('应该处理只有节点没有关系的数据', async () => {
      render(
        <OntologyNVLViewer 
          data={{ nodes: [mockNodes[0]], relationships: [] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('1 nodes');
        expect(screen.getByTestId('rel-count')).toHaveTextContent('0 relationships');
      });
    });

    test('应该清除搜索词时显示所有节点', async () => {
      render(<OntologyNVLViewer data={mockData} />);

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('3 nodes');
      });

      const searchInput = screen.getByPlaceholderText('Search nodes...');

      // 输入搜索词
      fireEvent.change(searchInput, { target: { value: 'Steel' } });

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('1 nodes');
      });

      // 清除搜索词
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('3 nodes');
      });
    });
  });
});

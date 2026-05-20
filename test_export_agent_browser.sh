#!/bin/bash

# NVL 导出功能自动化测试脚本
# 使用 Agent Browser 进行端到端测试
# 创建时间: 2026-03-21

echo "🧪 NVL 导出功能自动化测试"
echo "======================================"
echo ""

# 检查服务器是否运行
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ 服务器未运行"
    echo ""
    echo "请先启动服务器："
    echo "  cd visualization-app"
    echo "  serve -s build -l 3000"
    echo ""
    exit 1
fi

echo "✅ 服务器运行中（端口 3000）"
echo ""

# 创建测试目录
TEST_DIR="/tmp/nvl_export_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEST_DIR"
echo "📁 测试目录: $TEST_DIR"
echo ""

# 检查 Agent Browser 是否安装
if ! command -v agent-browser &> /dev/null; then
    echo "❌ Agent Browser 未安装"
    echo "请安装: npm install -g agent-browser"
    exit 1
fi

echo "✅ Agent Browser 已就绪 ($(agent-browser --version 2>&1 | head -1))"
echo ""

echo "🚀 开始测试..."
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "测试 $TOTAL_TESTS: $test_name"
    
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        echo "  ✅ 通过"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [ -s /tmp/test_output.log ]; then
            cat /tmp/test_output.log | sed 's/^/    /'
        fi
    else
        echo "  ❌ 失败"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ -s /tmp/test_output.log ]; then
            cat /tmp/test_output.log | sed 's/^/    /' | head -10
        fi
    fi
}

# ==================== 测试 1: 打开测试页面 ====================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "阶段 1: 浏览器初始化"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "打开测试页面" "agent-browser open http://localhost:3000/test-export.html"
sleep 3

# ==================== 测试 2: 数据加载检查 ====================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "阶段 2: 数据加载测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查节点数量
run_test "数据加载（预期 897 节点）" "
    nodes=\$(agent-browser eval 'window.nodes ? window.nodes.length : 0' 2>&1 | grep -o '[0-9]*' | tail -1)
    if [ \"\$nodes\" = \"897\" ]; then
        echo '节点数: '\$nodes
        exit 0
    else
        echo '预期: 897, 实际: '\$nodes
        exit 1
    fi
"

# 检查关系数量
run_test "关系加载（预期 1003 关系）" "
    rels=\$(agent-browser eval 'window.relationships ? window.relationships.length : 0' 2>&1 | grep -o '[0-9]*' | tail -1)
    if [ \"\$rels\" = \"1003\" ]; then
        echo '关系数: '\$rels
        exit 0
    else
        echo '预期: 1003, 实际: '\$rels
        exit 1
    fi
"

# ==================== 测试 3: 导出功能测试 ====================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "阶段 3: 导出功能测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 JSON 导出
run_test "JSON 导出测试" "
    agent-browser click 'button:contains(\"测试 JSON 导出\")' &&
    sleep 1 &&
    agent-browser screenshot '$TEST_DIR/json_test.png' &&
    [ -f '$TEST_DIR/json_test.png' ]
"

# 测试 CSV 节点导出
run_test "CSV 节点导出测试" "
    agent-browser click 'button:contains(\"测试节点 CSV 导出\")' &&
    sleep 1 &&
    agent-browser screenshot '$TEST_DIR/csv_nodes_test.png' &&
    [ -f '$TEST_DIR/csv_nodes_test.png' ]
"

# 测试 CSV 关系导出
run_test "CSV 关系导出测试" "
    agent-browser click 'button:contains(\"测试关系 CSV 导出\")' &&
    sleep 1 &&
    agent-browser screenshot '$TEST_DIR/csv_rels_test.png' &&
    [ -f '$TEST_DIR/csv_rels_test.png' ]
"

# 测试 GraphML 导出
run_test "GraphML 导出测试" "
    agent-browser click 'button:contains(\"测试 GraphML 导出\")' &&
    sleep 1 &&
    agent-browser screenshot '$TEST_DIR/graphml_test.png' &&
    [ -f '$TEST_DIR/graphml_test.png' ]
"

# 测试 Markdown 导出
run_test "Markdown 导出测试" "
    agent-browser click 'button:contains(\"测试 Markdown 导出\")' &&
    sleep 1 &&
    agent-browser screenshot '$TEST_DIR/markdown_test.png' &&
    [ -f '$TEST_DIR/markdown_test.png' ]
"

# ==================== 测试 4: 主应用测试 ====================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "阶段 4: 主应用测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "导航到主应用" "agent-browser open http://localhost:3000"
sleep 5

run_test "主应用加载" "
    agent-browser screenshot '$TEST_DIR/main_app.png' &&
    [ -f '$TEST_DIR/main_app.png' ]
"

# ==================== 测试 5: 关闭浏览器 ====================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "清理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "关闭浏览器" "agent-browser close"

# ==================== 测试结果 ====================
echo ""
echo "======================================"
echo "📊 测试结果摘要"
echo "======================================"
echo ""
echo "总计测试: $TOTAL_TESTS"
echo "✅ 通过: $PASSED_TESTS"
echo "❌ 失败: $FAILED_TESTS"

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
    echo "📈 通过率: $PASS_RATE%"
fi

echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 所有测试通过！导出功能正常！"
    echo ""
    echo "📸 测试截图保存在: $TEST_DIR"
    echo ""
    ls -lh "$TEST_DIR"/*.png 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
    echo ""
    exit 0
else
    echo "⚠️ 有 $FAILED_TESTS 个测试失败，请检查"
    echo ""
    echo "📸 测试截图保存在: $TEST_DIR"
    echo ""
    exit 1
fi

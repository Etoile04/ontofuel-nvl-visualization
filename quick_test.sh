#!/bin/bash

# NVL 导出功能快速测试
# 简化版 - 2026-03-21

echo "🧪 NVL 导出功能快速测试"
echo "======================================"
echo ""

# 检查服务器
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ 服务器未运行"
    exit 1
fi

echo "✅ 服务器运行中"

# 创建测试目录
TEST_DIR="/tmp/nvl_export_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEST_DIR"

# 测试计数
PASSED=0
FAILED=0

# 测试函数
test_step() {
    local name="$1"
    shift
    local cmd="$@"
    
    echo ""
    echo "测试: $name"
    
    if eval "$cmd" > /tmp/test.log 2>&1; then
        echo "  ✅ 通过"
        PASSED=$((PASSED + 1))
        if [ -s /tmp/test.log ]; then
            cat /tmp/test.log | grep -E "✓|http" | head -2 | sed 's/^/    /'
        fi
    else
        echo "  ❌ 失败"
        if [ -s /tmp/test.log ]; then
            cat /tmp/test.log | head -5 | sed 's/^/    /'
        fi
        FAILED=$((FAILED + 1))
    fi
}

# 测试 1: 打开测试页面
test_step "打开测试页面" agent-browser open http://localhost:3000/test-export.html
sleep 3

# 测试 2: 截图初始状态
test_step "截图初始状态" agent-browser screenshot "$TEST_DIR/initial.png"

# 测试 3: 测试 JSON 导出
test_step "JSON 导出" agent-browser click 'button:contains(测试)'
sleep 1
agent-browser screenshot "$TEST_DIR/json.png" > /dev/null 2>&1

# 测试 4: 测试 CSV 节点导出（使用简化的选择器）
echo ""
echo "测试: CSV 节点导出"
if agent-browser eval 'document.querySelectorAll("button")[3].click()' > /dev/null 2>&1; then
    echo "  ✅ 通过"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ 失败"
    FAILED=$((FAILED + 1))
fi
sleep 1
agent-browser screenshot "$TEST_DIR/csv_nodes.png" > /dev/null 2>&1

# 测试 5: 测试 GraphML 导出（使用简化的选择器）
echo ""
echo "测试: GraphML 导出"
if agent-browser eval 'document.querySelectorAll("button")[6].click()' > /dev/null 2>&1; then
    echo "  ✅ 通过"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ 失败"
    FAILED=$((FAILED + 1))
fi
sleep 1
agent-browser screenshot "$TEST_DIR/graphml.png" > /dev/null 2>&1

# 测试 6: 主应用
test_step "主应用加载" agent-browser open http://localhost:3000
sleep 5
agent-browser screenshot "$TEST_DIR/main_app.png" > /dev/null 2>&1

# 关闭浏览器
test_step "关闭浏览器" agent-browser close

# 结果
echo ""
echo "======================================"
echo "📊 测试结果"
echo "======================================"
echo ""
echo "✅ 通过: $PASSED"
echo "❌ 失败: $FAILED"
echo ""
echo "📸 截图保存在: $TEST_DIR"
ls -lh "$TEST_DIR"/*.png 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 所有测试通过！"
    exit 0
else
    echo "⚠️ 有 $FAILED 个测试失败"
    exit 1
fi

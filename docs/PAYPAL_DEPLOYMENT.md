# PayPal 集成部署指南

## 概述

已完成 PayPal 沙盒环境集成，支持：
- ✅ 一次性付款（$4.99/月 或 $39.99/年）
- ✅ 订阅制自动续费（$3.99/月 或 $31.99/年）
- ✅ Webhook 处理（退款、争议、订阅取消等）

---

## 1. 环境变量配置

### Cloudflare Pages Dashboard 设置

在 **Settings > Environment Variables** 中添加：

```
# PayPal 基础配置
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=AVY1BBoodTJ9nS2gWXDkLASxSP57gMrCTRlufSpBncx8RjbQ19UZ3ID16NcqTUPMd3cA3C1UHafICUKI
PAYPAL_CLIENT_SECRET=EHh7r6I3Uir9NkxoaB0bPEJwT00WQ39Cq4Z9zy_x_w0L-2s60P_AxwJJow1YM-qzfSz0EhT419-A0_SW

# 前端公开变量
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AVY1BBoodTJ9nS2gWXDkLASxSP57gMrCTRlufSpBncx8RjbQ19UZ3ID16NcqTUPMd3cA3C1UHafICUKI

# 管理密钥（用于设置订阅计划）
ADMIN_SECRET=your-secure-random-string-here
```

### 生产环境（Live）

当切换到 PayPal 生产环境时，更改为：

```
PAYPAL_ENV=live
PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_LIVE_CLIENT_SECRET
NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
```

---

## 2. 数据库迁移

在 Cloudflare Dashboard > D1 > Console 中执行：

```bash
# 使用 wrangler CLI 执行迁移
npx wrangler d1 execute image-bg-remover --file=migrations/0002_subscriptions.sql
```

或者手动复制 `migrations/0002_subscriptions.sql` 内容到 D1 Console 执行。

---

## 3. 配置订阅计划（一次性操作）

### 步骤 1：运行设置端点

部署后，访问：

```bash
curl -H "x-admin-secret: your-admin-secret" \
  https://stepnewworld.com/api/paypal/setup-plans
```

响应示例：

```json
{
  "success": true,
  "env": {
    "PAYPAL_PLAN_ID_MONTHLY": "P-XXXXXXXXXXXXXXXX",
    "PAYPAL_PLAN_ID_YEARLY": "P-YYYYYYYYYYYYYYYY"
  }
}
```

### 步骤 2：保存 Plan ID 到环境变量

将返回的 Plan ID 添加到 Cloudflare Pages 环境变量：

```
PAYPAL_PLAN_ID_MONTHLY=P-XXXXXXXXXXXXXXXX
PAYPAL_PLAN_ID_YEARLY=P-YYYYYYYYYYYYYYYY
```

---

## 4. 配置 PayPal Webhook

### 步骤 1：在 PayPal Dashboard 创建 Webhook

1. 登录 https://developer.paypal.com
2. 进入你的 App > Webhooks > Add Webhook
3. Webhook URL: `https://stepnewworld.com/api/paypal/webhook`
4. 选择以下事件：
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `CUSTOMER.DISPUTE.CREATED`

### 步骤 2：保存 Webhook ID

创建后，PayPal 会显示 Webhook ID，添加到环境变量：

```
PAYPAL_WEBHOOK_ID=YOUR_WEBHOOK_ID
```

---

## 5. 部署验证清单

### 部署前检查
- [ ] 所有环境变量已添加到 Cloudflare Pages
- [ ] 数据库迁移已执行
- [ ] 代码已推送到 GitHub

### 部署后验证
- [ ] 访问 `/pricing` 页面，PayPal 按钮正常显示
- [ ] 使用 PayPal 沙盒账户测试支付流程
- [ ] 支付成功后用户计划升级为 Pro
- [ ] Dashboard 显示正确的订阅状态

### PayPal 沙盒测试账户

在 https://developer.paypal.com/dashboard/accounts 创建或使用默认沙盒账户：
- **Personal** 账户：用于模拟买家付款
- **Business** 账户：用于接收付款

---

## 6. API 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/paypal/create-order` | POST | 创建一次性付款订单 |
| `/api/paypal/capture-order` | POST | 捕获/确认付款 |
| `/api/paypal/create-subscription` | POST | 创建订阅 |
| `/api/paypal/webhook` | POST | PayPal 回调处理 |
| `/api/paypal/setup-plans` | GET | 初始化订阅计划（管理员） |

---

## 7. 故障排查

### 问题：PayPal 按钮不显示

检查：
1. `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 是否正确设置
2. 浏览器控制台是否有 JS 错误
3. 网络面板是否加载了 PayPal SDK

### 问题：支付成功但计划未升级

检查：
1. D1 数据库连接是否正常
2. `/api/paypal/capture-order` 响应是否成功
3. Cloudflare Logs 查看错误信息

### 问题：Webhook 未触发

检查：
1. Webhook URL 是否正确（HTTPS）
2. `PAYPAL_WEBHOOK_ID` 是否设置
3. PayPal Dashboard 中 Webhook 状态

---

## 8. 切换到生产环境

1. 在 PayPal 创建 Live App，获取 Live Client ID/Secret
2. 更新环境变量为 Live 凭证
3. 重新运行 `/api/paypal/setup-plans` 获取 Live Plan IDs
4. 在 Live App 中创建 Webhook
5. 更新 `PAYPAL_ENV=live`
6. 重新部署

---

## 9. 安全注意事项

- ✅ `PAYPAL_CLIENT_SECRET` 永远不要暴露到前端
- ✅ `ADMIN_SECRET` 使用强随机字符串
- ✅ Webhook 签名验证已启用（生产环境必需）
- ✅ 所有支付操作都有服务器端验证

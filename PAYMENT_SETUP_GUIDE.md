# MaxAPI 支付接入完全指南

> 本文档详细说明如何在 MaxAPI 项目中接入 PayPal、支付宝、微信支付，包括资质要求、申请流程、密钥配置、测试验证等全部细节。

---

## 目录

1. [当前支付能力概览](#一当前支付能力概览)
2. [PayPal 配置（已接入）](#二paypal-配置已接入)
3. [支付宝接入指南](#三支付宝接入指南)
4. [微信支付接入指南](#四微信支付接入指南)
5. [生产环境部署配置](#五生产环境部署配置)
6. [常见问题排查](#六常见问题排查)

---

## 一、当前支付能力概览

MaxAPI 目前支持三种支付方式：

| 支付方式 | 状态 | 适用场景 | 需要资质 |
|---------|------|---------|---------|
| **PayPal** | ✅ 已就绪 | 国际用户、信用卡/钱包 | 个人/企业均可 |
| **支付宝** | ⏳ 待配置 | 中国大陆用户 | 企业/个体户营业执照 |
| **微信支付** | ⏳ 待配置 | 中国大陆用户 | 企业/个体户营业执照 |

**核心特点**：
- 代码层面已 100% 实现，无需再写任何代码
- 接入方式：申请商户账号 → 获取密钥 → 填入环境变量 → 重启服务
- 系统会自动检测哪些支付方式已配置，只向用户显示可用的选项

---

## 二、PayPal 配置（已接入）

### 2.1 当前配置状态

你的开发环境已经配置好了 PayPal **沙盒（Sandbox）**，可以用于本地测试支付流程。

### 2.2 沙盒环境 ↔ 生产环境切换

MaxAPI 通过 `PAYPAL_SANDBOX` 环境变量控制使用沙盒还是生产环境：

```env
# 开发测试（假钱，不会真实扣款）
PAYPAL_SANDBOX="true"

# 生产上线（真钱，真实扣款）
PAYPAL_SANDBOX="false"
```

### 2.3 生产环境上线步骤

#### 第一步：注册 PayPal 开发者账号

1. 访问 [PayPal Developer](https://developer.paypal.com/)
2. 用你真实的 PayPal 企业账号登录（如果没有，先注册 PayPal 企业账号）
3. 进入 **Dashboard → Apps & Credentials**

#### 第二步：创建 Live 应用

1. 点击 **Create App**
2. App Name 填写：`MaxAPI`（或你的品牌名）
3. 选择 **Merchant** 类型
4. 创建后会得到：
   - **Client ID**（长字符串，类似 `AaB3...`）
   - **Secret**（点击 Show 才会显示，需要保存）

#### 第三步：配置 Webhook（用于支付回调）

1. 在应用详情页点击 **Add Webhook**
2. Webhook URL 填写你的域名：
   ```
   https://你的域名/api/payments/webhook/paypal
   ```
   例如：
   ```
   https://api.yoursite.com/api/payments/webhook/paypal
   ```
3. **Event types** 必须勾选以下两项：
   - `Payment capture completed`
   - `Payment capture denied`
   - （建议全选所有 Payment 相关事件）
4. 保存后会得到一个 **Webhook ID**（类似 `1AB23456CD789012E`）

#### 第四步：替换环境变量

```env
# 生产环境 .env 配置
PAYPAL_CLIENT_ID="从 PayPal 后台复制的 Live Client ID"
PAYPAL_CLIENT_SECRET="从 PayPal 后台复制的 Live Secret"
PAYPAL_WEBHOOK_ID="从 PayPal 后台复制的 Webhook ID"
PAYPAL_SANDBOX="false"
```

#### 第五步：重启服务

```bash
docker compose restart app
```

---

## 三、支付宝接入指南

### 3.1 资质要求

**硬性要求**：必须有营业执照（以下二者之一）

| 主体类型 | 说明 | 能否申请 |
|---------|------|---------|
| 企业营业执照 | 有限公司、个体工商户等 | ✅ 可以 |
| 个人 | 身份证，无营业执照 | ❌ 不可以 |

**其他要求**：
- 一个实名认证的支付宝账号（作为超级管理员）
- 一个已备案的域名（用于接收支付回调）
- 一个对公银行账户（企业类型）或个人银行卡（个体户）

### 3.2 申请流程（预计 1-3 个工作日）

#### 第一步：注册支付宝开放平台账号

1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 点击 **立即入驻**
3. 用企业/个体户的支付宝账号扫码登录
4. 填写企业基本信息：
   - 企业名称（与营业执照一致）
   - 统一社会信用代码
   - 营业执照照片（需清晰，四角完整）
   - 法人身份证正反面
   - 联系人信息

#### 第二步：创建应用

1. 登录后进入 **控制台 → 我的应用**
2. 点击 **创建应用 → 网页/移动应用**
3. 填写应用信息：
   - **应用名称**：`MaxAPI`（建议与你的品牌名一致）
   - **应用类型**：`网页应用`
   - **应用图标**：上传你的 Logo
4. 创建后进入应用详情页

#### 第三步：签约支付产品

1. 在应用详情页点击 **产品绑定**
2. 搜索并添加 **电脑网站支付**（`alipay.trade.page.pay`）
3. 点击 **立即签约**，填写经营信息：
   - 经营类目（选择最接近的，如 "IT/互联网服务"）
   - 网站地址（填写你的域名）
   - 客服电话
4. 提交审核，通常 **1-3 个工作日** 出结果

#### 第四步：配置密钥（最关键）

签约通过后，需要生成 RSA2 密钥对：

1. 进入应用详情页 → **开发设置 → 接口加签方式**
2. 点击 **设置加签方式**
3. 选择 **公钥证书模式**（推荐，安全性更高）或 **公钥模式**

**公钥模式（简单）**：
1. 下载 [支付宝密钥生成工具](https://opendocs.alipay.com/common/02kipl)
2. 打开工具，选择 **RSA2**、**PKCS8**
3. 点击 **生成密钥**
4. 会得到两个文件：
   - **应用私钥**（`private_key.txt`）→ 这个你自己保存，谁都不能给
   - **应用公钥**（`public_key.txt`）→ 这个要填到支付宝后台
5. 把公钥内容粘贴到支付宝后台的 **填写公钥** 框里
6. 支付宝会给你一串 **支付宝公钥** → 这个后续验签要用

**公钥证书模式（更安全，推荐生产环境）**：
1. 同上生成密钥对
2. 在支付宝后台申请 **CSR 证书**
3. 下载证书文件（`appCertPublicKey.crt`）
4. 上传 CSR 后下载支付宝公钥证书

#### 第五步：配置应用网关和回调地址

1. 进入应用详情页 → **开发设置**
2. **应用网关**：可暂不填，或填你的域名
3. **授权回调地址**：可暂不填
4. **AES 密钥**：可选，不填也行

### 3.3 申请下来后你会拿到什么

| 名称 | 从哪里拿到 | 在 MaxAPI 里对应哪个变量 |
|-----|-----------|------------------------|
| **AppID** | 应用详情页左上角 | `ALIPAY_APP_ID` |
| **应用私钥** | 密钥工具生成的 `private_key.txt` | `ALIPAY_PRIVATE_KEY` |
| **支付宝公钥** | 后台"查看支付宝公钥" | `ALIPAY_PUBLIC_KEY` |
| **网关地址** | 固定值 | `ALIPAY_GATEWAY_URL` |

### 3.4 在 MaxAPI 中配置支付宝

#### 开发环境（.env.local）

打开项目根目录的 `.env.local`，找到支付宝部分，取消注释并填入：

```env
# 支付宝（已配置，开发环境可用）
ALIPAY_APP_ID="2024XXXXXXX"
ALIPAY_PRIVATE_KEY="MIIEvgIBADANBgkqhkiG9w0BAQE...（一长串，包含 BEGIN/END 的那整个内容）"
ALIPAY_PUBLIC_KEY="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8...（支付宝公钥，不是你自己的公钥）"
ALIPAY_GATEWAY_URL="https://openapi.alipaydev.com/gateway.do"
```

**注意**：
- 开发测试时网关用 `https://openapi.alipaydev.com/gateway.do`（沙盒网关）
- 生产环境网关用 `https://openapi.alipay.com/gateway.do`（正式网关）
- 私钥必须包含 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----` 这两行

#### 私钥格式处理

如果你拿到的私钥是一长串没有换行的字符串，需要格式化为 PEM 格式。MaxAPI 代码里已经做了自动格式化，但为了保险，建议你手动格式化为标准 PEM：

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQE...
（每行64个字符）
...（中间内容）
-----END PRIVATE KEY-----
```

#### 生产环境（docker-compose.yml）

```yaml
app:
  environment:
    ALIPAY_APP_ID: ${ALIPAY_APP_ID}
    ALIPAY_PRIVATE_KEY: ${ALIPAY_PRIVATE_KEY}
    ALIPAY_PUBLIC_KEY: ${ALIPAY_PUBLIC_KEY}
    ALIPAY_GATEWAY_URL: ${ALIPAY_GATEWAY_URL:-https://openapi.alipay.com/gateway.do}
```

### 3.5 测试验证

#### 沙盒测试

1. 访问 [支付宝沙盒环境](https://open.alipay.com/develop/sandbox/account)
2. 你会看到系统提供的沙盒买家账号和密码
3. 在 MaxAPI 的充值页面选择支付宝 → 选择金额 → 跳转
4. 用沙盒买家账号登录并"支付"
5. 支付成功后回到 MaxAPI，查看余额是否增加

#### 查看日志

如果支付后余额没增加，查看日志：

```bash
# Docker 方式查看日志
docker compose logs -f app

# 本地开发方式查看日志
# 看终端输出，搜索 "alipay" 关键字
```

常见原因：
- 私钥格式不对 → 检查是否包含 BEGIN/END 标记
- 用了支付宝公钥而不是应用私钥 → 私钥是你自己生成的，公钥是给支付宝的
- 网关地址错了 → 开发环境必须用 `alipaydev.com`

---

## 四、微信支付接入指南

### 4.1 资质要求

**硬性要求**：必须有营业执照

| 主体类型 | 说明 | 能否申请 |
|---------|------|---------|
| 企业 | 有限公司 | ✅ 可以 |
| 个体户 | 个体工商户 | ✅ 可以 |
| 个人 | 无营业执照 | ❌ 不可以 |

**其他要求**：
- 一个已认证的服务号或小程序（需 300 元认证费）
- 一个已备案的域名
- 一个对公银行账户（用于结算）

### 4.2 申请流程（预计 3-7 个工作日）

#### 第一步：注册微信支付商户号

1. 访问 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 点击 **成为商户 → 立即入驻**
3. 选择 **个体工商户/企业**
4. 填写基本信息：
   - 营业执照信息（拍照上传）
   - 法人身份证
   - 银行账户信息（用于收款）
   - 经营类目
   - 联系人信息
5. 提交审核，通常 **1-3 个工作日**

#### 第二步：绑定 AppID

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入 **产品中心 → AppID 账号管理**
3. 点击 **关联 AppID**
4. 填写你的 AppID（如果是网页支付，可以是服务号的 AppID）
5. 去微信公众平台确认绑定

#### 第三步：开通 Native 支付

1. 在商户平台进入 **产品中心**
2. 找到 **Native 支付** → 点击 **申请开通**
3. 填写产品信息（简要描述你的业务场景）
4. 审核通过后即可使用

#### 第四步：配置 APIv3 密钥和证书（最关键）

微信支付使用 APIv3 协议，需要以下材料：

**1. 商户号（mchId）**
- 在商户平台首页就能看到，10 位数字，如 `1234567890`

**2. APIv3 密钥（apiV3Key）**
- 进入 **账户中心 → API安全 → APIv3密钥**
- 点击 **设置密钥**
- 随机生成一个 32 位字符串（只能设置一次，务必保存好）

**3. 商户 API 证书（privateKey + certSerialNo）**
- 进入 **账户中心 → API安全 → API证书**
- 点击 **申请新证书**
- 按照指引操作，最终会下载一个 `.p12` 或 `.pem` 文件
- 解压后得到：
  - `apiclient_key.pem` → 这是你的**私钥**，对应 `WECHAT_PRIVATE_KEY`
  - 证书序列号 → 对应 `WECHAT_CERT_SERIAL_NO`

**4. 平台证书（platformPublicKey）**
- 微信会用平台证书加密回调通知
- 需要调用微信的接口获取，或用官方工具下载
- 进入 **账户中心 → API安全 → 平台证书**
- 下载最新的平台证书，里面包含公钥

### 4.3 申请下来后你会拿到什么

| 名称 | 从哪里拿到 | 在 MaxAPI 里对应哪个变量 |
|-----|-----------|------------------------|
| **AppID** | 微信公众平台/服务号后台 | `WECHAT_APP_ID` |
| **商户号** | 微信支付商户平台首页 | `WECHAT_MCH_ID` |
| **APIv3 密钥** | 商户平台 → API安全 → APIv3密钥 | `WECHAT_API_V3_KEY` |
| **商户证书私钥** | 下载的 `apiclient_key.pem` 文件内容 | `WECHAT_PRIVATE_KEY` |
| **证书序列号** | 商户平台证书管理页面 | `WECHAT_CERT_SERIAL_NO` |
| **平台公钥** | 商户平台下载的平台证书中提取 | `WECHAT_PLATFORM_PUBLIC_KEY` |

### 4.4 在 MaxAPI 中配置微信支付

#### 开发环境（.env.local）

```env
# 微信支付（已配置，开发环境可用）
WECHAT_APP_ID="wx1234567890abcdef"
WECHAT_MCH_ID="1234567890"
WECHAT_API_V3_KEY="Your32CharLongRandomKeyHere123"
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----"
WECHAT_CERT_SERIAL_NO="1AB2C3D4E5F6789012345678901234567890ABCD"
WECHAT_PLATFORM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8...\n-----END PUBLIC KEY-----"
```

**重要格式说明**：
- 私钥和公钥**必须包含** `-----BEGIN/END XXX KEY-----` 标记
- 如果私钥是 `.pem` 文件，直接把整个文件内容复制进来
- 换行处理：`.env.local` 里可以直接换行，但某些系统可能需要写成 `\n`

#### 关于平台公钥的获取

平台公钥不能直接从证书文件复制，需要从证书中提取：

```bash
# 从微信下载的平台证书（.pem 格式）中提取公钥
openssl x509 -in wechatpay_xxxx.pem -pubkey -noout
```

输出内容就是 `WECHAT_PLATFORM_PUBLIC_KEY` 的值。

#### 生产环境（docker-compose.yml）

```yaml
app:
  environment:
    WECHAT_APP_ID: ${WECHAT_APP_ID}
    WECHAT_MCH_ID: ${WECHAT_MCH_ID}
    WECHAT_API_V3_KEY: ${WECHAT_API_V3_KEY}
    WECHAT_PRIVATE_KEY: ${WECHAT_PRIVATE_KEY}
    WECHAT_CERT_SERIAL_NO: ${WECHAT_CERT_SERIAL_NO}
    WECHAT_PLATFORM_PUBLIC_KEY: ${WECHAT_PLATFORM_PUBLIC_KEY}
```

### 4.5 配置支付回调

微信支付的回调地址需要在商户平台配置：

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入 **产品中心 → 开发配置**
3. 找到 ** Native 支付** → **支付回调 URL**
4. 填写：
   ```
   https://你的域名/api/payments/webhook/wechat
   ```
   例如：
   ```
   https://api.yoursite.com/api/payments/webhook/wechat
   ```

### 4.6 测试验证

#### 沙盒/测试环境

微信支付没有独立的沙盒环境，但有 **测试金额**：

1. 在 MaxAPI 充值页面选择微信支付
2. 选择任意金额（建议先用小额如 0.01 元测试）
3. 会显示一个二维码
4. 用微信扫一扫，如果是测试环境，通常可以用微信支付的测试模式

**注意**：微信支付的真实测试需要在商户平台的 **产品中心 → 测试产品** 中申请测试权限。

#### 查看日志

```bash
docker compose logs -f app | grep -i wechat
```

常见错误：
- `Invalid WeChat Pay signature` → 平台公钥配错了，或者时间戳不同步
- `Could not create WeChat Pay order` → 商户号未开通 Native 支付
- `WeChat Pay amount mismatch` → 金额计算有问题（一般是汇率问题）

---

## 五、生产环境部署配置

### 5.1 环境变量汇总

当你三种支付方式都申请完毕后，生产环境的 `.env` 文件应该是这样：

```env
# ==========================================
# 基础配置
# ==========================================
DATABASE_URL="postgresql://user:pass@db:5432/maxapi?schema=public"
APP_BASE_URL="https://api.yoursite.com"
AUTH_SECRET="至少32位的随机字符串，用于JWT签名"
API_KEY_PEPPER="另一串不同的随机字符串，用于API Key哈希"

# ==========================================
# PayPal（国际支付）
# ==========================================
PAYPAL_CLIENT_ID="从 PayPal 后台复制的 Live Client ID"
PAYPAL_CLIENT_SECRET="从 PayPal 后台复制的 Live Secret"
PAYPAL_WEBHOOK_ID="从 PayPal 后台复制的 Webhook ID"
PAYPAL_SANDBOX="false"

# ==========================================
# 支付宝（中国大陆）
# ==========================================
ALIPAY_APP_ID="2024XXXXXXXXXXXX"
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALIPAY_GATEWAY_URL="https://openapi.alipay.com/gateway.do"

# ==========================================
# 微信支付（中国大陆）
# ==========================================
WECHAT_APP_ID="wxXXXXXXXXXXXXXXXX"
WECHAT_MCH_ID="1234567890"
WECHAT_API_V3_KEY="32位随机密钥"
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
WECHAT_CERT_SERIAL_NO="从商户平台复制的证书序列号"
WECHAT_PLATFORM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# ==========================================
# 可选：Redis（多实例部署时建议开启）
# ==========================================
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# ==========================================
# 可选：邮件服务（用户注册/找回密码用）
# ==========================================
RESEND_API_KEY="re_xxxxxxxx"
AUTH_EMAIL_FROM="noreply@yoursite.com"
```

### 5.2 Docker Compose 生产配置

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: maxapi
      POSTGRES_PASSWORD: "强密码"
      POSTGRES_DB: maxapi
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://maxapi:强密码@db:5432/maxapi?schema=public"
      APP_BASE_URL: "https://api.yoursite.com"
      AUTH_SECRET: "强随机字符串"
      API_KEY_PEPPER: "另一串强随机字符串"
      PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID}
      PAYPAL_CLIENT_SECRET: ${PAYPAL_CLIENT_SECRET}
      PAYPAL_WEBHOOK_ID: ${PAYPAL_WEBHOOK_ID}
      PAYPAL_SANDBOX: "false"
      ALIPAY_APP_ID: ${ALIPAY_APP_ID}
      ALIPAY_PRIVATE_KEY: ${ALIPAY_PRIVATE_KEY}
      ALIPAY_PUBLIC_KEY: ${ALIPAY_PUBLIC_KEY}
      ALIPAY_GATEWAY_URL: "https://openapi.alipay.com/gateway.do"
      WECHAT_APP_ID: ${WECHAT_APP_ID}
      WECHAT_MCH_ID: ${WECHAT_MCH_ID}
      WECHAT_API_V3_KEY: ${WECHAT_API_V3_KEY}
      WECHAT_PRIVATE_KEY: ${WECHAT_PRIVATE_KEY}
      WECHAT_CERT_SERIAL_NO: ${WECHAT_CERT_SERIAL_NO}
      WECHAT_PLATFORM_PUBLIC_KEY: ${WECHAT_PLATFORM_PUBLIC_KEY}
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

### 5.3 数据库配置方式（高级）

除了环境变量，MaxAPI 还支持在 **数据库里配置支付参数**，这样不需要重启服务就能切换支付账号：

1. 以管理员身份登录 MaxAPI 后台
2. 进入 **Ops → Payment Provider Instances**
3. 点击 **Create Instance**
4. 填写：
   - Provider: `ALIPAY` 或 `WECHAT`
   - Label: 任意名称（如 "Production Alipay"）
   - Priority: 数字越小优先级越高
   - Config: JSON 格式填入密钥
     ```json
     {
       "appId": "2024XXXXXXX",
       "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
       "publicKey": "-----BEGIN PUBLIC KEY-----\n..."
     }
     ```
5. 保存后立即生效

**优先级**：数据库配置 > 环境变量。如果数据库里有 ACTIVE 的实例，会优先使用数据库里的配置。

---

## 六、常见问题排查

### Q1: 支付页面只显示 PayPal，不显示支付宝/微信

**原因**：系统检测到支付宝/微信的环境变量未配置或配置不完整。

**排查**：
```bash
# 检查环境变量是否加载
cat .env.local | grep -E "ALIPAY|WECHAT"

# 检查是否有空值
```

**解决**：确保六个微信变量或三个支付宝变量都已填写，且不是空字符串。

### Q2: 支付宝跳转后显示 "调试错误"

**原因**：
- 用了正式环境的 AppID 但网关是沙盒网关
- 私钥格式不对
- 签名算法选错了（必须是 RSA2）

**解决**：
- 检查 `ALIPAY_GATEWAY_URL` 和 `ALIPAY_APP_ID` 是否匹配（沙盒 AppID 配沙盒网关）
- 检查私钥是否包含 `-----BEGIN PRIVATE KEY-----`

### Q3: 微信支付二维码出不来

**原因**：
- 商户号没开通 Native 支付
- APIv3 密钥错误
- 证书序列号不对

**解决**：
- 登录商户平台确认 Native 支付已开通
- 重新设置 APIv3 密钥（注意：设置后旧密钥立即失效）
- 检查 `WECHAT_CERT_SERIAL_NO` 是否和当前使用的证书匹配

### Q4: 用户支付成功了，但余额没增加

**原因**：Webhook 回调没收到或处理失败。

**排查**：
```bash
# 查看 webhook 日志
docker compose logs -f app | grep -i webhook

# 查看 paymentWebhookEvent 表
docker compose exec db psql -U maxapi -d maxapi -c "SELECT * FROM \"PaymentWebhookEvent\" ORDER BY created_at DESC LIMIT 10;"
```

**常见原因**：
- 服务器没外网，支付宝/微信发不到你的回调地址
- 回调地址配错了（少了 `/api/payments/webhook/xxx`）
- HTTPS 证书有问题
- 防火墙拦截了外部请求

### Q5: 如何确认 Webhook 能正常接收？

**PayPal**：
1. 在 PayPal 开发者后台找到你的 Webhook
2. 点击 **Send Test Event**
3. 选择 `Payment capture completed`
4. 查看你的服务器是否收到请求

**支付宝**：
1. 在支付宝开放平台的应用详情页
2. 找到 **功能列表 → 电脑网站支付 → 测试**
3. 或者用 [在线工具](https://opensupport.alipay.com/) 模拟回调

**微信支付**：
1. 微信没有官方的 Webhook 测试工具
2. 可以用 Postman 模拟请求，但签名很难伪造
3. 建议直接用真实的小额支付测试

---

## 附录：申请时间表参考

| 步骤 | PayPal | 支付宝 | 微信支付 |
|-----|--------|--------|---------|
| 注册账号 | 即时 | 即时 | 即时 |
| 提交资质审核 | 不需要 | 1-3 工作日 | 1-3 工作日 |
| 创建应用/商户号 | 即时 | 即时 | 1-3 工作日 |
| 签约支付产品 | 不需要 | 1-3 工作日 | 即时（需先审核通过） |
| 配置密钥 | 即时 | 即时 | 即时 |
| **总计** | **即时** | **3-7 天** | **3-7 天** |

---

> 如果你在某个具体步骤卡住了，把报错截图或错误信息发给我，我可以帮你继续排查。

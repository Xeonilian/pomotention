# WebDAV 同步数据

## 账户准备

### 坚果云

1. 登录[坚果云](https://www.jianguoyun.com/)，从账户信息进入安全选项
2. 添加应用，输入`pomotention`，点击生成密码，获得应用密码
3. 本软件中提供信息，帮助页点击<img src="/icons/ArrowSync24Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;">按钮，输入：
   - https://dav.jianguoyun.com/dav/
   - 坚果云账号
   - 应用密码
   - 保存路径：`/PomodoroBackup`
4. 再次点击同步按钮，打开同步界面。

> [参考坚果云 Zotero 设置](https://help.jianguoyun.com/?p=3168)

---

### 其他支持 WebDAV 的云盘（通用设置方法）

如果您使用的云盘或服务器本身支持 WebDAV（如 Nextcloud、ownCloud、TeraCLOUD 等），请按照如下方式进行设置：

1. **登录您的云盘或 WebDAV 服务后台，确认已开启 WebDAV 功能**。部分服务或自建平台需在管理后台启用 WebDAV，并设置用于连接的账号与密码。
2. 获取：
   - **WebDAV 服务地址**
   - **用户名**：填写您的云盘账户名，或自建 WebDAV 服务分配的用户名
   - **密码/应用密码**：填写您的登录密码、专用的应用密码或服务方提供的访问密钥（如有）
3. 后续设置同坚果云

:::info
不同 WebDAV 服务的地址格式和认证方式可能略有不同；如果连接遇到问题，请优先查看云盘官方文档或联系服务商获取帮助。
:::

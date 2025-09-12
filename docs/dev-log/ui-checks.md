# UI checks

## UI check #1 导出 ics QR 码

Given:

- 任务区域存在数据

When:

- 点击行，选中导出内容
- 点击按钮，弹出 QR 码

Then:

- 高亮行,按钮变为蓝色

![](ui-checks\20250912-qr-ics-full-after.png)

- 弹出二维码 20250912-qr-ics-code-after.png

![](ui-checks\20250912-qr-ics-code-after.png)

## UI check #2 导出 ics 文件

Given:

- 任务区域存在数据
- 无数据行被选中

When:

- 按钮变为黑色
- 点击按钮，弹出文件选择对话框

Then:

- 黑色按钮

  ![黑色按钮](ui-checks\20250912-qr-ics-after.png)

- 加入按钮前

  ![加入按钮前](ui-checks\20250912-qr-ics-before.png)

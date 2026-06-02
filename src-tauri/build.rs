fn main() {
    // 图标变更时触发 Rust 重编译，dev 下任务栏/标题栏图标才会更新
    let icons = std::path::Path::new("icons");
    if icons.is_dir() {
        println!("cargo:rerun-if-changed=icons");
        if let Ok(entries) = std::fs::read_dir(icons) {
            for entry in entries.flatten() {
                println!("cargo:rerun-if-changed={}", entry.path().display());
            }
        }
    }
    tauri_build::build()
}

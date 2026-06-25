
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let script       = include_str!("../../extension_scripts/tms_inject.js");
            let ocr_eval     = include_str!("../../extension_scripts/tms_ocr_eval.js");
            let captcha_ui   = include_str!("../../extension_scripts/mainScriptCaptcha.js");

            let _window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into())
            )
            .title("TMS Pro")
            .inner_size(1200.0, 800.0)
            .initialization_script(script)
            .initialization_script(ocr_eval)
            .initialization_script(captcha_ui)
            .build()
            .unwrap();

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

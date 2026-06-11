// ====== DOM Elements ======
const editor = document.getElementById('editor')
const fileName = document.getElementById('file-name')
const fileIndicator = document.getElementById('file-indicator')
const charCount = document.getElementById('char-count')
const lineCount = document.getElementById('line-count')
const wordCount = document.getElementById('word-count')
const lineNumbers = document.getElementById('line-numbers')

// Update Banner
const updateBanner = document.getElementById('update-banner')
const updateText = document.getElementById('update-text')
const updateBtn = document.getElementById('update-btn')
const updateBtnText = document.getElementById('update-btn-text')
const updateDismiss = document.getElementById('update-dismiss')
const updateProgressWrapper = document.getElementById('update-progress-wrapper')
const updateProgressFill = document.getElementById('update-progress-fill')
const updateProgressText = document.getElementById('update-progress-text')

// Status bar
const statusUpdate = document.getElementById('status-update')
const statusUpdateText = document.getElementById('status-update-text')

// App version
const appVersion = document.getElementById('app-version')

// ====== Init ======
async function init() {
    const version = await window.electronAPI.getAppVersion()
    appVersion.textContent = `v${version}`
}
init()

// ====== Status Update ======
function updateStatus() {
    const text = editor.value
    const chars = text.length
    const lines = text.split('\n').length
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length

    charCount.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
        Ký tự: ${chars}`
    lineCount.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
        Dòng: ${lines}`
    wordCount.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        Từ: ${words}`

    updateLineNumbers()
}

// ====== Line Numbers ======
function updateLineNumbers() {
    const lines = editor.value.split('\n').length
    let nums = ''
    for (let i = 1; i <= lines; i++) {
        nums += i + '\n'
    }
    lineNumbers.textContent = nums
}

editor.addEventListener('input', updateStatus)

// Sync scroll between editor and line numbers
editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop
})

// ====== File Operations ======

// Tạo mới
document.getElementById('btn-new').addEventListener('click', () => {
    editor.value = ''
    fileName.textContent = 'Chưa có file'
    fileIndicator.classList.remove('has-file')
    updateStatus()
})

// Mở file
document.getElementById('btn-open').addEventListener('click', async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
        editor.value = result.content
        fileName.textContent = getShortPath(result.filePath)
        fileIndicator.classList.add('has-file')
        updateStatus()
    }
})

// Lưu
document.getElementById('btn-save').addEventListener('click', async () => {
    const result = await window.electronAPI.saveFile(editor.value)
    if (result) {
        fileName.textContent = getShortPath(result.filePath)
        fileIndicator.classList.add('has-file')
    }
})

// Lưu thành...
document.getElementById('btn-save-as').addEventListener('click', async () => {
    const result = await window.electronAPI.saveFileAs(editor.value)
    if (result) {
        fileName.textContent = getShortPath(result.filePath)
        fileIndicator.classList.add('has-file')
    }
})

function getShortPath(fullPath) {
    const parts = fullPath.replace(/\\/g, '/').split('/')
    if (parts.length <= 3) return fullPath
    return '.../' + parts.slice(-2).join('/')
}

// ====== Keyboard Shortcuts ======
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        document.getElementById('btn-new').click()
    }
    if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        document.getElementById('btn-open').click()
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        if (e.shiftKey) {
            document.getElementById('btn-save-as').click()
        } else {
            document.getElementById('btn-save').click()
        }
    }
})

// ====== Window Controls ======
document.getElementById('btn-minimize').addEventListener('click', () => {
    window.electronAPI.windowMinimize()
})

document.getElementById('btn-maximize').addEventListener('click', () => {
    window.electronAPI.windowMaximize()
})

document.getElementById('btn-close').addEventListener('click', () => {
    window.electronAPI.windowClose()
})

// Double-click titlebar to maximize
document.getElementById('titlebar').addEventListener('dblclick', (e) => {
    if (e.target.closest('.titlebar-controls')) return
    window.electronAPI.windowMaximize()
})

// Listen for window state changes
window.electronAPI.onWindowStateChanged((data) => {
    const icon = document.getElementById('maximize-icon')
    if (data.isMaximized) {
        icon.innerHTML = '<g><rect x="3" y="0" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/><rect x="0.5" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/></g>'
    } else {
        icon.innerHTML = '<rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>'
    }
})

// ====== Auto Update ======
let updateState = 'idle'

window.electronAPI.onUpdateStatus((data) => {
    switch (data.status) {
        case 'checking':
            statusUpdateText.textContent = 'Đang kiểm tra...'
            statusUpdate.querySelector('svg').classList.add('spin')
            break

        case 'available':
            updateState = 'available'
            // Show banner
            updateBanner.classList.add('visible')
            updateText.textContent = `Phiên bản mới ${data.version} đã sẵn sàng!`
            updateBtn.style.display = 'inline-flex'
            updateBtnText.textContent = 'Cập nhật ngay'
            updateBtn.className = 'update-btn'
            updateProgressWrapper.classList.remove('visible')

            // Status bar
            statusUpdate.classList.add('has-update')
            statusUpdateText.textContent = `Có bản mới v${data.version}`
            statusUpdate.querySelector('svg').classList.remove('spin')
            break

        case 'up-to-date':
            statusUpdateText.textContent = 'Đã cập nhật'
            statusUpdate.classList.remove('has-update')
            statusUpdate.querySelector('svg').classList.remove('spin')
            break

        case 'downloading':
            updateState = 'downloading'
            updateText.textContent = 'Đang tải bản cập nhật...'
            updateBtn.classList.add('downloading')
            updateBtnText.textContent = 'Đang tải...'
            updateProgressWrapper.classList.add('visible')
            updateProgressFill.style.width = data.percent + '%'
            updateProgressText.textContent = data.percent + '%'

            // Status bar
            statusUpdateText.textContent = `Đang tải ${data.percent}%`
            break

        case 'downloaded':
            updateState = 'downloaded'
            updateText.textContent = 'Bản cập nhật đã tải xong! Nhấn để cài đặt và khởi động lại.'
            updateBtn.className = 'update-btn install'
            updateBtn.style.display = 'inline-flex'
            updateBtnText.textContent = 'Cài đặt & Khởi động lại'
            updateProgressWrapper.classList.remove('visible')

            // Status bar
            statusUpdateText.textContent = 'Sẵn sàng cài đặt'
            statusUpdate.classList.add('has-update')
            break

        case 'error':
            statusUpdate.querySelector('svg').classList.remove('spin')
            statusUpdate.classList.remove('has-update')

            // Nếu đang ở trạng thái idle (kiểm tra tự động lúc mở app)
            // → im lặng, không hiện lỗi (vì chưa có Release trên GitHub)
            if (updateState === 'idle') {
                statusUpdateText.textContent = 'Đã cập nhật'
                updateBanner.classList.remove('visible')
            } else {
                // Chỉ hiện lỗi khi user chủ động kiểm tra/tải
                statusUpdateText.textContent = 'Lỗi cập nhật'
                updateText.textContent = 'Lỗi khi cập nhật. Vui lòng thử lại sau.'
                updateBtn.style.display = 'inline-flex'
                updateBtnText.textContent = 'Thử lại'
                updateBtn.className = 'update-btn'
                updateProgressWrapper.classList.remove('visible')
                updateState = 'error'
            }
            break
    }
})

// Update button click
updateBtn.addEventListener('click', () => {
    switch (updateState) {
        case 'available':
        case 'error':
            // Start downloading
            window.electronAPI.startDownload()
            updateBtnText.textContent = 'Đang tải...'
            updateBtn.classList.add('downloading')
            break

        case 'downloaded':
            // Quit and install
            updateBtnText.textContent = 'Đang cài đặt...'
            updateBtn.classList.add('downloading')
            setTimeout(() => {
                window.electronAPI.quitAndInstall()
            }, 500)
            break
    }
})

// Dismiss update banner
updateDismiss.addEventListener('click', () => {
    updateBanner.classList.remove('visible')
})

// Click status bar update indicator to show banner / check update
statusUpdate.addEventListener('click', () => {
    if (updateState === 'available' || updateState === 'downloaded' || updateState === 'downloading') {
        updateBanner.classList.add('visible')
    } else {
        window.electronAPI.checkForUpdate()
    }
})

// ====== Initial state ======
updateStatus()
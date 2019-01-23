import {makeTerminal} from './terminal';
import {makeDockerSocket} from './server-comm';

let appState = {};
const bodyTag = document.getElementsByTagName('body')[0];

makeTerminal(document.getElementById('terminal'), appState);

const editor = ace.edit("editor");
editor.session.setMode("ace/mode/c_cpp");
editor.focus();
// In the CSS, we set the font color equal to the background color so that the
// initial code doesn't show as unformatted while we load JS. Now that we've
// loaded, set it to the proper color
document.getElementById('editor').style.color = 'inherit';
// Add 8px of padding on the bottom of the editor. This makes things look nicer
// in the embedded code-only view, where we reduce the editor margin to 0
editor.renderer.setScrollMargin(0, 8);
// Disable ACE custom cmd+l (goto line)
delete editor.keyBinding.$defaultHandler.commandKeyBinding["cmd-l"];
delete editor.keyBinding.$defaultHandler.commandKeyBinding["ctrl-l"];
// Show settings pane on cmd+comma
editor.commands.addCommand({
    bindKey: {win: "Ctrl-,", mac: "Command-,"},
    exec: toggleSettingsSidebar,
});

function getCompilerFlags() {
    const flags = [];
    for (let el of document.querySelectorAll('#compiler-flags select,'
                                           + '#compiler-flags input')) {
        if (el.tagName.toLowerCase() === 'select' || el.checked) {
            flags.push(el.value);
        }
    }
    return flags;
}

function compileAndExec(code) {
    appState.term.reset();
    makeDockerSocket(appState);
    appState.socket.on('disconnect', function() {
        document.getElementById('run-btn').classList.remove('disabled');
        appState.socket = null;
    });
    document.getElementById('run-btn').classList.add('disabled');
    appState.socket.emit('run', {
        code: code,
        language: document.getElementById('language-select').value,
        flags: getCompilerFlags(),
        args: document.getElementById('runtime-args').value,
    });
}

function handleRunBtnClick() {
    // If we are in embedded mode, go into terminal-only view
    if (bodyTag.classList.contains('embedded')) {
        bodyTag.classList.remove('show-code-only');
        bodyTag.classList.remove('show-split');
        bodyTag.classList.add('show-term-only');
    }
    if (!appState.socket) {
        compileAndExec(editor.getValue());
    }
}

function toggleSettingsSidebar() {
    const primaryContainer =
        document.getElementsByClassName('primary-container')[0];
    if (primaryContainer.classList.contains('open-sidebar')) {
        primaryContainer.classList.remove('open-sidebar');
    } else {
        primaryContainer.classList.add('open-sidebar');
    }
    // Manually resize ACE editor after CSS transition has completed
    setTimeout(() => editor.resize(), 300);
}

function showEditorPane() {
    bodyTag.classList.remove('show-split');
    bodyTag.classList.remove('show-term-only');
    bodyTag.classList.add('show-code-only');
    // Manually resize ACE editor after CSS transition has completed
    setTimeout(() => editor.resize(), 300);
}

function showSplitView() {
    bodyTag.classList.remove('show-term-only');
    bodyTag.classList.remove('show-code-only');
    bodyTag.classList.add('show-split');
    // Manually resize ACE editor after CSS transition has completed
    setTimeout(() => editor.resize(), 300);
}

document.getElementById('run-btn').onclick = handleRunBtnClick;

document.getElementById('settings-btn').onclick = toggleSettingsSidebar;

document.getElementById('edit-btn').onclick = showEditorPane;

document.getElementById('split-pane-btn').onclick = showSplitView;

document.getElementById('open-in-cfiddle-btn').onclick = () => {
    window.open(window.location.href.replace('/embed', '/'), "_blank");
};

document.onkeydown = function(e) {
    const event = e || window.event;
    // Execute code on shift+enter
    if (e.keyCode === 13 && e.shiftKey) {
        handleRunBtnClick();
        return false;
    }
    // Open settings on cmd/ctrl+comma
    const isMac = ['Macintosh', 'MacIntel'].indexOf(window.navigator.platform) > -1;
    if ((isMac && e.metaKey && e.keyCode === 188)
            || (!isMac && e.ctrlKey && e.keyCode === 188)) {
        toggleSettingsSidebar();
        return false;
    }
    // Open editor pane on cmd/ctrl+e
    if ((isMac && e.metaKey && e.keyCode === 69)
            || (!isMac && e.ctrlKey && e.keyCode === 69)) {
        showEditorPane();
        return false;
    }
}

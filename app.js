
let dataService = {
    highlightSVG: function (html) {

        function markWords(line, lTag, rTag) {
            let newLine = "";
            let tag = false; let word = false;
            for (let i = 0; i < line.length; i++) {
                if (line[i] === "<") { 
                    tag = true;
                    if (word) { newLine = newLine + rTag; }
                    word = false;
                }
                else if (line[i] === ">") { tag = false; }
                else if (!tag && (line[i] === " ")) { 
                    if (word) { newLine = newLine + rTag; }
                    word = false;
                }
                else if (!tag) { 
                    if (!word) { newLine = newLine + lTag; }
                    word = true;
                }
                newLine = newLine + line[i];
            }
            if (word) { newLine = newLine + rTag; }
            return newLine;
        }

        function restoreQuotes(qArr, line) {
            qArr.forEach(s => {
                s = renameSymbols(s, true);
                s = markWords(s, '<span class="blue">', '</span>');
                s = restoreSymbols(s, true);
                line = line.replace("QOQO", s);
            });
            return line;
        }

        function renameSymbols(line, qMode) {
            line = line.replace(/&nbsp;/gi, "<&nbsp;>");
            if (!qMode) { line = line.replace(/=/g, "<=>"); }
            return line;
        }

        function restoreSymbols(line, qMode) {
            line = line.replace(/<&nbsp;>/gi, "&nbsp;");
            if (!qMode) { line = line.replace(/<=>/g, "="); }
            return line;
        }
        
        function highlightTagLine(line) {
            let qArr = [];
            while (line.indexOf('"') > -1) {
                let start = line.indexOf('"'); let finish = line.indexOf('"', start + 1);
                if (finish < 0 ) { finish = line.length - 1; }
                qArr.push(line.substr(start, finish - start + 1));
                line = line.substr(0, start) + "QOQO" + line.substr(finish + 1);
            }
            line = renameSymbols(line);
            line = markWords(line, '<span class="red">', '</span>');
            line = line.replace('<span class="red">', '<span class="brown">'); // first span = tag name
            let start = line.indexOf('<=>');
            while (start > -1) {
                line = line.substr(0, start) + line.substr(start).replace('<span class="red">', '<span class="blue">');
                start = line.indexOf('<=>', start + 1);                
            }
            line = restoreSymbols(line);
            line = restoreQuotes(qArr, line);
            line = line.replace(/<span class="blue"><span class="blue">/gi, '<span class="blue">');
            line = line.replace(/<\/span><\/span>/gi, '</span>');
            return line;
        }

        function highlightLine(line) {
            let arr = line.split("&gt;");
            arr[0] = highlightTagLine(arr[0]);
            return arr.join("&gt;");
        }

        html = html.replace(/<\/?span.*?>/gi, ""); // remove spans - editable div adds useless spans sometimes
        let linesArr = html.split("&lt;");
        for (let i = 1; i < linesArr.length; i++) {
            linesArr[i] = highlightLine(linesArr[i]);
        }
        let res = linesArr.join("&lt;");
        res = res.replace(/&[l|g]t;/g, x => '<span class="blue">' + x + '</span>');
        return res;
    },
    formatCode: function (text, compact) {

        function splitToTagLines(text) {
            let arr = text.split("<");
            let lines = [arr[0]];
            for (let i = 1; i < arr.length; i++) {
                let idx = arr[i].indexOf(">");
                if (idx < 0) { lines.push("<" + arr[i]); }
                else {
                    lines.push("<" + arr[i].substr(0, idx + 1));
                    lines.push(arr[i].substr(idx + 1));
                }
            }
            for (let i = lines.length - 1; i >= 0; i--) {
                if (!lines[i] || lines[i] === " ") { lines.splice(i, 1); }
            }
            return lines;
        }

        function lineLevels(lines) {
            let arr = []; let level = 0;
            lines.forEach(s => {
                if (s[0] !== "<" || s[s.length - 1] !== ">" || s[s.length - 2] === "/") { arr.push(level); }
                else if (s[1] === "/") { 
                    level--;
                    if (level < 0) { level = 0; }
                    arr.push(level);
                }
                else {
                    arr.push(level);
                    level++;
                }
            });
            return arr;
        }

        function splitToParams(tLine) {
            if (tLine[0] !== "<" || tLine.indexOf("=") < 0) { return [tLine]; }
            let qArr = [];
            tLine = tLine.replace(/".*?"/g, s => {
                qArr.push(s); return "QOQO";
            });
            tLine = tLine.replace(/[\w:-]*\s?=/g, s => "\n" + s); // param=
            if (tLine.indexOf("\n") > 0) { tLine = tLine.replace(/(\/>$)|>$/, s => "\n" + s); } // /> or >            
            qArr.forEach(s => tLine = tLine.replace("QOQO", s));
            tLine = tLine.replace(/\n+/g, "\n");            
            let lines = tLine.split("\n");
            return lines;
        }

        text = text.replace(/\s+/g,' ').trim();
        let tLines = splitToTagLines(text);
        levels = lineLevels(tLines);
        tLines.forEach((s, idx, arr) => {
            let pLines = splitToParams(s);
            if (compact || pLines.length < 2) { arr[idx] = " ".repeat(4 * levels[idx]) + s; return; }
            pLines.forEach((s2, idx2, arr2) => {
                arr2[idx2] = " ".repeat(4 * levels[idx]) + s2;
                if (idx2 > 0 && !(idx2 === arr2.length - 1 && s2[s2.length - 1] === ">")) { arr2[idx2] = "    " + arr2[idx2]; }
            });
            arr[idx] = pLines.join("\n");
        });
        return tLines.join("\n");
    },
    download: function (filename, text) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);      
        element.style.display = 'none';
        document.body.appendChild(element);      
        element.click();      
        document.body.removeChild(element);
    },
    saveSVGToFile: function (filename, content, width, height, minify) {
        if (minify) { content = content.replace(/\s+/g,' ').trim(); }
        //console.log(content.replace(/\n/g, "|"));
        //content = content.replace(/\n\n/g, "\n");
        let text = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
        text = text + "\n" + '<svg xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" xmlns:osb="http://www.openswatchbook.org/uri/2009/osb" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ';
        text = text + width + " " + height + '" xmlns:dc="http://purl.org/dc/elements/1.1/">';
        text = text + "\n" + content + "\n" + '</svg>';        
        if (filename) { this.download(filename, text); }
        return text;
    },
    extractRoundedNum: function (s) {
        let arr = s.split(/[\.|,]/);
        return arr[0] * 1;
    },
    parseFileData: function (fData) {
        let res = {width: 0, height: 0};
        let dataL = fData.toLowerCase();
        let start = dataL.indexOf("<svg ");
        let finish = dataL.indexOf(">", start + 1);
        let finish2 = dataL.indexOf("</svg");
        res.content = fData.substr(finish + 1, finish2 - finish - 1).trim();
        res.content = res.content.replace(/\r\n/g, "\n");
        start = dataL.indexOf("viewbox", start + 1);
        if (start < 0) { return res; }
        start = dataL.indexOf('"', start + 1);
        finish = dataL.indexOf('"', start + 1);
        let arr = fData.substr(start + 1, finish - start - 1).split(" ");
        if (arr.length < 4) { return res; }
        res.width = this.extractRoundedNum(arr[2]);
        res.height = this.extractRoundedNum(arr[3]);
        return res;
    },
    caretY: function (range) {
        let len = range.getClientRects().length;
        if (len < 1) { return 0; }
        let d = range.getClientRects()[len - 1].y - range.getClientRects()[0].y;
        let h = range.getClientRects()[0].height;
        let res = Math.round(d / h);
        if (range.endOffset < 1 && !range.endContainer.textContent) { res++; }
        return res;
    },
    caretPos: function (div) {
        let res = {x: 0, y: 0};
        let _range = document.getSelection().getRangeAt(0);
        let range = _range.cloneRange();
        range.selectNodeContents(div);
        range.setEnd(_range.endContainer, _range.endOffset);
        res.x = _range.endOffset;        
        res.y = this.caretY(range);
        res.text = _range.endContainer.textContent || "";
        res.select = _range.startContainer !== _range.endContainer || _range.startOffset !== _range.endOffset;
        //console.log(res);
        return res;
    },
    processSVGErrMsg: function (msg) {
        let res = {msg: "", line: -1};
        let arr = msg.split("\n");
        for (let i = arr.length - 1; i >= 0; i--) {
            let idx = arr[i].toLowerCase().indexOf("line");
            if (idx < 0) { arr.splice(i, 1); continue; }
            let sStart = arr[i].substr(0, idx + 4);
            let sNum = arr[i].substr(idx + 4, 6);
            let SFinish = arr[i].substr(idx + 10);
            sNum = sNum.replace(/\d+/, x => {
                res.line = x;
                return x - 2;
            });
            arr[i] = sStart + sNum + SFinish;
        }
        res.msg = arr.join("\n");
        if (!res.msg) { res.msg = msg; }
        return res;
    },
    htmlToText: function (html) { // innerText is not 100% right for some cases (line breaks count)
        let text = html;
        text = text.replace(/<\/?span.*?>/gi, ""); // remove spans - editable div adds useless spans sometimes
        text = text.replace(/(<div>)+<br><\/div>/gi, "\n");
        text = text.replace(/<br><\/div>/gi, "");
        text = text.replace(/<br>(<div>)+/gi, "\n");
        text = text.replace(/(<div>)+/gi, "<div>");
        text = text.replace(/<div>/gi, "\n");
        text = text.replace(/<br>/gi, "\n");
        text = text.replace(/<.*?>/gi, "");
        text = text.replace(/&lt;/gi, "<");
        text = text.replace(/&gt;/gi, ">");
        text = text.replace(/&nbsp;/gi, " ");
        return text;
    },
    textToHtml: function (text) {
        let html = text;        
        html = html.replace(/</g, "&lt;");
        html = html.replace(/>/g, "&gt;");
        html = html.replace(/ /g, "&nbsp;");
        html = html.replace(/\n/g, "<br>");
        return html;
    }
};

Vue.component('svg-viewer', {
    props: ["code"],
    data: function () {
        return {
            errorMsg: ""
        }
    },
    watch: {
        code: function () {
            this.errorMsg = "";
            let dataUri = "data:image/svg+xml;base64," + btoa(this.code);
            this.$refs.svg.src = dataUri;
        }
    },
    methods: {
        error: function (e) {
            if (!this.code) { this.errorMsg = ""; }
            else { 
                this.errorMsg = " ";
                let blob = new Blob([this.code], { type: "image/svg+xml" });
                this.$refs.iframe.src = URL.createObjectURL(blob);
                setTimeout(() => {
                    let errData = dataService.processSVGErrMsg(this.$refs.iframe.contentWindow.document.body.innerText);                    
                    this.errorMsg = errData.msg;
                    if (errData.line > -1) { this.errorMsg = this.errorMsg + ": " + this.code.split("\n")[errData.line - 1]; }
                }, 300);
            }
        }
    },
    template: `
        <div class="svgviewer">
            <img class="imgsvg" v-show="code&&!errorMsg" src="" ref="svg" v-on:error="error">
            <div class="imgerr" v-show="errorMsg">
                Error. Check Your code! More info:
                <br><br>
                {{ errorMsg }}
                <iframe ref="iframe"></iframe>
            </div>
        </div>
    `
});

Vue.component('svg-editor', {
    props: ["code"],
    watch: {
        code: function () {
            if (this.code === dataService.htmlToText(this.$refs.memo.innerHTML)) { return; }
            //console.log(dataService.textToHtml(this.code));
            this.$refs.memo.innerHTML = dataService.textToHtml(this.code);
            this.updateHTML();
            this.$emit("change-code", this.code);            
        }
    },
    methods: {
        updateHTML: function () {            
            //console.time("highlight");
            this.$refs.memoback.innerHTML = dataService.highlightSVG(this.$refs.memo.innerHTML);            
            //console.timeEnd("highlight");
        },
        setChangeListener: function (div, listener) {
            div.addEventListener("blur", listener);
            div.addEventListener("keyup", listener);
            div.addEventListener("keydown", listener);
            div.addEventListener("paste", listener);
            div.addEventListener("copy", listener);
            div.addEventListener("cut", listener);
            div.addEventListener("delete", listener);
            div.addEventListener("mouseup", listener);
        }
    },    
    mounted: function () {
        const memo = this.$refs.memo;
        const memoBack = this.$refs.memoback;
        var posX = 0; var posY = 0;

        let listener = event => {            
            let pos = dataService.caretPos(memo);
            if (pos.x !== posX || pos.y !== posY) {
                posX = pos.x; posY = pos.y;
                this.$emit("caret-pos", pos);
            }
            if (event.type === "paste" || event.type === "cut" || event.type === "copy") {
                if (event.type === "paste") {
                    event.preventDefault();
                    let text = event.clipboardData.getData("text/plain");
                    text = text.replace(/\r/g, "");
                    document.execCommand("insertText", false, text);
                }
                setTimeout(() => listener({}));
            }
            else if (event.type === "keydown" && event.key === "Tab") {
                if (pos.select) { return; }
                event.preventDefault();                
                document.execCommand("insertText", false, ' '.repeat(4 - pos.x % 4));                
            }
            else if (event.type === "keydown" && event.key === "Backspace") {
                if (pos.select) { return; }
                let startText = pos.text.substr(0, pos.x);
                if (startText.length < 1 || startText.trim()) { return; }
                let delCount = 4 - (4 - pos.x) % 4;
                if (delCount < 2) { return; }
                event.preventDefault();                
                for (let i = 0; i < delCount; i++) { document.execCommand("delete", false); }                
            }
            else if (event.type === "keydown" && event.key === "Enter") {
                if (pos.select) { return; }
                let sCount = pos.text.length - pos.text.trimLeft().length;
                if (sCount < 1) { return; }
                if (pos.x < sCount) { sCount = pos.x; }
                event.preventDefault();
                document.execCommand("insertText", false, "\n" + ' '.repeat(sCount));
            }
            if (memo.innerText === memoBack.innerText) { return; }
            this.updateHTML();
            //console.time("htmlToText");
            this.$emit("change-code", dataService.htmlToText(memo.innerHTML));
            //console.timeEnd("htmlToText");
            //console.log("[HTML]", dataService.htmlToText(this.$refs.memo.innerHTML));
        };

        this.setChangeListener(memo, listener);
    },
    template: `
        <div class="svgeditor">
            <div class="memoback" ref="memoback"></div>
            <div class="memo" ref="memo" contenteditable="true"></div>
        </div>
    `
});

Vue.component('panes-layout', {
    mounted: function () {
        var md = {}; // mouse down info
        const first = this.$refs.first;
        const sep = this.$refs.separator;
        const panes = this.$refs.panes;
        sep.onmousedown = onMouseDown;

        function onMouseDown(e) {
            md = {x: e.x, firstWidth: first.offsetWidth};
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);            
        }

        function onMouseUp(e) {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        function onMouseMove(e) {
            let delta = e.x - md.x;
            let widthPx = md.firstWidth + delta;
            let widthPr = Math.round(widthPx * 100 / panes.offsetWidth);
            first.style.width = widthPr + "%";
        }
    },
    template: `
        <div class="panes" ref="panes">
            <div class="first" ref="first">
                <slot name="first"></slot>
            </div>
            <div class="separator" ref="separator"></div>
            <div class="second">
                <slot name="second"></slot>
            </div>
        </div>
    `
});

Vue.component('load-file', {
    mounted: function () {
        this.$refs.fileselect.addEventListener('change', event => {
            const fileList = event.target.files;
            if (fileList.length < 1) { 
                this.$emit("load", null);
                return;
            }
            const fName = fileList[0].name ? fileList[0].name : "file1.svg";
            const reader = new FileReader();
            reader.addEventListener('load', event => {
                let fData = event.target.result;
                this.$emit("load", {name: fName, data: fData});
            });
            reader.readAsText(fileList[0]);            
        });
    },
    template: `
        <div>
            <input type="file" ref="fileselect" accept=".svg">            
            <button v-on:click="$emit('load',null)"> X </button>
        </div>
    `
});

Vue.component('save-file', {
    props: ["name", "minify"],
    data: function () {
        return {
            dName: "", dMinify: false,
            valid: true
        }
    },
    watch: {
        name: function () { this.dName = this.name; },
        minify: function () { this.dMinify = this.minify; }
    },
    created: function () {
        this.dName = this.name;
        this.dMinify = this.minify;
    },
    methods: {        
        validate: function () {
            this.valid = false;
            if (!(this.dName.toLowerCase().endsWith(".svg") && this.dName.trim() === this.dName && this.dName.length > 4)) { return; }
            this.valid = true;
        },
        submit: function () {
            let info = {name: this.dName, minify: this.dMinify};
            this.$emit("save", info);
        }
    },
    template: `
    <div class="savefile">
        File Name: <input type="text" v-model="dName" @input=validate> &nbsp;
        <input type="checkbox" v-model="dMinify">Minify &nbsp;
        <button v-bind:disabled="!valid" v-on:click="submit"> V </button>
        <button v-on:click="$emit('save',null)"> X </button>
    </div>
    `
});

Vue.component('format-code', {
    props: ["compact"],
    data: function () {
        return {
            dCompact: false
        }
    },
    watch: {        
        compact: function () { this.dCompact = this.compact; }
    },
    created: function () {
        this.dCompact = this.compact;
    },
    methods: {        
        submit: function () {
            let info = {compact: this.dCompact};
            this.$emit("format", info);
        }
    },
    template: `
    <div class="formatcode">
        <input type="checkbox" v-model="dCompact">Compact Mode &nbsp;
        <button v-on:click="submit"> V </button>
        <button v-on:click="$emit('format',null)"> X </button>
    </div>
    `
});

Vue.component('set-params', {
    props: ["width", "height"],
    data: function () {
        return {
            dWidth: 0, dHeight: 0,
            valid: true
        }
    },
    watch: {
        width: function () { this.dWidth = this.width; },
        height: function () { this.dHeight = this.height; }        
    },
    created: function () {
        this.dWidth = this.width; this.dHeight = this.height;        
    },
    methods: {        
        validate: function () {
            this.valid = false;
            if (!/^[1-9]\d{0,3}$/.test(this.dWidth)) { return; }
            if (!/^[1-9]\d{0,3}$/.test(this.dHeight)) { return; }            
            this.valid = true;
        },
        submit: function () {
            let info = {width: this.dWidth * 1, height: this.dHeight * 1};
            this.$emit("set-params", info);
        }
    },
    template: `
    <div class="setparams">
        Width: <input type="number" min="1" max="9999" v-model="dWidth" @input=validate> &nbsp;
        Height: <input type="number" min="1" max="9999" v-model="dHeight" @input=validate> &nbsp;
        <button v-bind:disabled="!valid" v-on:click="submit"> V </button>
        <button v-on:click="$emit('set-params',null)"> X </button>
    </div>
    `
});

var app = new Vue({
    el: '#app',
    data: {        
        code: "",
        svgCode: "",
        activeDlg: "",
        fName: "file1.svg",
        width: 400,
        height: 400,
        minify: false,
        compact: false,
        col: 1,
        row: 1,
        infoMsg: "Welcome to SVG Editor! Write Your SVGs here!"
    },
    methods: {
        changeCode: function (newCode) {
            this.code = newCode;            
        },
        caretPos: function (pos) {
            this.col = pos.x + 1;
            this.row = pos.y + 1;
        },
        run: function () {
            this.svgCode = dataService.saveSVGToFile(null, this.code, this.width, this.height, false);
            this.activeDlg = "";
        },
        newFile: function () {
            this.code = "";
            this.activeDlg = "";
            this.fName = "file1.svg";
            this.infoMsg = "New SVG created! Write Your code!";
            this.run();
        },
        loadFile: function (info) {
            this.activeDlg = "";
            if (!info) { return; }            
            let pInfo = dataService.parseFileData(info.data);
            if (!pInfo.content) { return; }
            this.fName = info.name;
            if (pInfo.width > 0) { this.width = pInfo.width; }
            if (pInfo.height > 0) { this.height = pInfo.height; }
            this.code = pInfo.content;
            this.infoMsg = 'File "' + this.fName + '" loaded.';
            this.run();
        },
        saveFile: function (info) {
            this.activeDlg = "";
            if (!info) { return; }
            this.fName = info.name; this.minify = info.minify;
            dataService.saveSVGToFile(this.fName, this.code, this.width, this.height, this.minify);
            this.infoMsg = 'File "' + this.fName + '" saved.';
        },
        setParams: function (info) {
            this.activeDlg = "";
            if (!info) { return; }
            this.width = info.width; this.height = info.height;
            this.infoMsg = "Params changed.";
            this.run();
        },
        formatCode: function (info) {
            this.activeDlg = "";
            if (!info) { return; }
            this.compact = info.compact;
            this.infoMsg = "Code formatted.";
            this.code = dataService.formatCode(this.code, info.compact);
        }
    }
});
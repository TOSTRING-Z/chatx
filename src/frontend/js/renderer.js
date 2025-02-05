document.addEventListener("click", (event) => {
  // 添加链接点击事件监听，用于打开默认浏览器
  if (event.target.tagName === "A") {
    event.preventDefault();
    window.electronAPI.openExternal(event.target.href)
  }

  // 使用Clipboard API进行复制
  if (event.target.classList.contains("copy-btn")) {
    const codeToCopy = decodeURIComponent(event.target.getAttribute('data-code'));
    navigator.clipboard.writeText(codeToCopy).then(() => {
      showLog('复制成功');
    }).catch(err => {
      console.error('复制失败', err);
    });
  }

  return event;

});

const player = document.getElementById("player");
const content = document.getElementById("content");
const input = document.getElementById("input");
const submit = document.getElementById("submit");
const messages = document.getElementById("messages");
const top_div = document.getElementById("top_div");
const bottom_div = document.getElementById("bottom_div");

const input_h = input.clientHeight;

function autoResizeTextarea(textarea) {
  textarea.style.height = null;
  const inputHeight = Math.min(textarea.scrollHeight, input_h * 3);
  textarea.style.height = inputHeight + "px";
  top_div.style.height = window.innerHeight - bottom_div.clientHeight + "px"
}

function init_size() {
  player.style.height = input_h + "px";
  input.style.height = input_h + "px";
  top_div.style.height = window.innerHeight - bottom_div.clientHeight + "px";
}

document.addEventListener("DOMContentLoaded", function () {

  autoResizeTextarea(input);

  // 监听输入事件，自动调整高度
  [input, player].forEach(textarea => {
    textarea.addEventListener("input", function () {
      autoResizeTextarea(textarea);
      if (this.value.trim() !== '') {
        submit.classList.add('success');
      } else {
        submit.classList.remove('success');
      }
    });
    textarea.addEventListener("click", function () {
      autoResizeTextarea(textarea);
    })
  });

  top_div.addEventListener("click", function () {
    init_size();
  })

  // 添加事件监听器，监听窗口的resize事件
  window.addEventListener("resize", function () {
    init_size();
  });
});

let prompt;

user_message = `<div class="relative space-y-2 space-x-2" data-role="user" data-id="@id">
  <div class="flex flex-row-reverse w-full">
    <div class="menu-container">
      <img class="menu user" src="img/user.svg" alt="User Avatar">
    </div>
    <div class="message">@message</div>
  </div>
</div>`;

system_message = `<div class="relative space-y-2 space-x-2" data-role="system" data-id="@id">
  <div class="flex flex-row w-full">
    <div class="menu-container">
      <img class="menu system" src="img/@icon.svg" alt="System Avatar">
      <div class="menu-item">
        <svg viewBox="0 0 1024 1024">
            <path fill="#ffffff"
                d="M950.857143 224.304762H799.695238V63.390476H224.304762v160.914286H73.142857v97.523809h87.771429v638.780953h697.295238V321.828571h92.647619v-97.523809zM321.828571 160.914286h385.219048v63.390476H321.828571V160.914286z m438.857143 702.171428H258.438095V321.828571h502.247619v541.257143z">
            </path>
            <path fill="#ffffff"
                d="M355.961905 438.857143h97.523809v326.704762h-97.523809zM570.514286 438.857143h97.523809v326.704762h-97.523809z">
            </path>
        </svg>
      </div>
      <div class="menu-item">
        <svg viewBox="0 0 1024 1024">
          <path fill="#ffffff"
              d="M725.333333 960H128c-23.466667 0-42.666667-19.2-42.666667-42.666667V277.333333c0-23.466667 19.2-42.666667 42.666667-42.666666h128V106.666667c0-23.466667 19.2-42.666667 42.666667-42.666667h597.333333c23.466667 0 42.666667 19.2 42.666667 42.666667v640c0 23.466667-19.2 42.666667-42.666667 42.666666h-128v128c0 23.466667-19.2 42.666667-42.666667 42.666667zM170.666667 874.666667h512V320H170.666667v554.666667z m170.666666-725.333334v85.333334h384c23.466667 0 42.666667 19.2 42.666667 42.666666v426.666667h85.333333V149.333333H341.333333z">
          </path>
          <path fill="#ffffff"
              d="M298.666667 490.666667h128c23.466667 0 42.666667-19.2 42.666666-42.666667s-19.2-42.666667-42.666666-42.666667h-128c-23.466667 0-42.666667 19.2-42.666667 42.666667s19.2 42.666667 42.666667 42.666667M512 576H298.666667c-23.466667 0-42.666667 19.2-42.666667 42.666667s19.2 42.666667 42.666667 42.666666h213.333333c23.466667 0 42.666667-19.2 42.666667-42.666666s-19.2-42.666667-42.666667-42.666667">
          </path>
        </svg>
      </div>
    </div>
    <div class="message">@message</div>
  </div>
</div>`

function showLog(log) {
  const htmlString = `<div style="display: flex; pointer-events: none; height: 100%; width: 100%; justify-content: center; align-items: center; font-size: large; position: absolute;">
          <b style="border: 2px solid #666; text-align: center; padding: 5px; background: white;">${log}</b>
      </div>`;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const newElement = doc.body.firstChild;
  document.body.appendChild(newElement);
  setInterval(() => { newElement.remove() }, 2000)
}

function copy_message(raw) {
  navigator.clipboard.writeText(raw).then(() => {
    showLog('复制成功');
  }).catch(err => {
    console.error('复制失败', err);
  });
}

function menuEvent(id, raw) {
  const messageSystem = document.querySelectorAll(`[data-id='${id}']`)[1];
  const menuContainer = messageSystem.getElementsByClassName('menu-container')[0];
  const menu = menuContainer.getElementsByClassName("menu")[0];
  const menu_items = menuContainer.getElementsByClassName("menu-item");

  [...menu_items].forEach((menu_item, i) => {
    menu_item.addEventListener('click', (e) => {
      e.stopPropagation();
      menuContainer.classList.remove('active');
      switch (i) {
        case 0:
          delete_message(id);
          break;
        case 1:
          copy_message(raw);
          break;

        default:
          break;
      }

    })
  })

  menu.addEventListener('mouseenter', () => {
    menuContainer.classList.add('active');
  })

  menuContainer.addEventListener('mouseleave', () => {
    menuContainer.classList.remove('active');
  })
}


const { Marked } = globalThis.marked;
const { markedHighlight } = globalThis.markedHighlight;

const formatCode = (type, raw, text) => {
  const language = hljs.getLanguage(type) ? type : "plaintext";
  const encodeCode = encodeURIComponent(text);
  const highlightResult = hljs.highlight(raw, { language }).value;
  return `<div class="code-header">
        <span class="language-tag">${language}</span>
        <button
            class="copy-btn"
            data-code="${encodeCode}"
            title="复制代码"
        >复制</button>
    </div>
    <pre class="hljs"><code>${highlightResult}</code></pre>`;
}

const formatText = (type, raw, text) => {
  const language = hljs.getLanguage(type) ? type : "plaintext";
  const highlightResult = hljs.highlight(raw, { language }).value;
  return highlightResult;
}

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(text, lang) {
      return text;
    }
  }),
  {
    renderer: {
      link({ type, raw, text }) {
        return formatText(type, raw, text);
      },
      html({ type, raw, text }) {
        return formatText(type, raw, text);
      },
      text({ raw }) {
        return raw;
      },
      code({ lang, raw, text }) {
        return formatCode(lang, raw, text);
      },
    }
  }
);

var typesetMath = function () { };

// 扩展 String 原型
String.prototype.format = function (params, role) {
  let htmlString = this.replace(/@(\w+)/g, (match, key) => {
    let param;
    if (key === "message") {
      if (role === "system") {
        param = marked.parse(params[key].trim());
      } else {
        param = marked.parse(params[key].trim());
      }
    } else {
      param = params[key];
    }
    return typeof params[key] !== 'undefined' ? param : match;
  });
  // 创建一个新的DOMParser实例
  const parser = new DOMParser();
  // 使用DOMParser将HTML字符串解析为DOM文档
  const doc = parser.parseFromString(htmlString, 'text/html');
  // 获取解析后的元素
  const newElement = doc.body.firstChild;
  return newElement;
};

window.electronAPI.handleMathFormat((math_statu) => {
  if (math_statu) {
    typesetMath = function () {
      MathJax.typesetPromise().catch((err) => console.log(err));
    }
    typesetMath();
  }
  else {
    typesetMath = function () { }
  }
})

async function delete_message(id, model) {
  await window.electronAPI.deleteMessage({
    id: id,
    model, model
  });
  var elements = document.querySelectorAll(`[data-id="${id}"]`);
  elements.forEach(function (element) {
    element.remove();
  });
}

function response_success(id) {
  // 获取所有类名为 "system" 的元素
  var elements = document.querySelectorAll(`[data-id="${id}"]`);
  elements.forEach(function (element) {
    if (element.getAttribute('data-role') === 'system') {
      element.remove();
    }
  });
}

function getIcon(is_plugin) {
  return is_plugin ? "api" : "ai";
}

window.electronAPI.handleQuery(async (data) => {
  let text;
  if (data.img_url) {
    content.value = input.value;
    text = content.value;
    text = `![user](${data.img_url})${text}`;
  } else {
    content.value = data.text;
    text = content.value;
  }
  messages.appendChild(user_message.format({
    "id": data.id,
    "message": text
  }, "user"));
  messages.appendChild(system_message.format({
    "icon": getIcon(data.is_plugin),
    "id": data.id,
    "message": "思考中..."
  }, "system"));
  // 设置滚动位置到div的最低端
  top_div.scrollTop = top_div.scrollHeight;
  text = await window.electronAPI.queryText({ prompt: player.value, query: content.value, model: data.model, version: data.version, is_plugin: data.is_plugin, img_url: data.img_url, id: data.id });
  text = text ? text : "结果返回为空！";
  response_success(data.id);
  messages.appendChild(system_message.format({
    "icon": getIcon(data.is_plugin),
    "id": data.id,
    "message": text
  }, "system"));
  typesetMath();
  menuEvent(data.id, text);
})

window.electronAPI.handleModel((data) => {
  content.value = null;
  if (data.is_plugin) {
    player.style.display = "none";
    init_size();
  }
  else {
    player.style.display = "block";
    init_size();
  }
})

window.electronAPI.handlePrompt((text) => {
  prompt = text;
  player.value = prompt;
})

window.electronAPI.handleClear(() => {
  player.value = prompt;
  messages.innerHTML = null;
})


window.electronAPI.handleLoad((data) => {
  messages.innerHTML = null;
  for (i in data) {
    let text;
    if (data[i].role == "user") {
      if (typeof data[i].content !== 'string') {
        text = data[i].content.find(c => c.type == "text").text;
        text = `![user](${data[i].content.find(c => c.type == "image_url").image_url.url})${text}`;
      } else {
        text = data[i].content;
      }
      messages.appendChild(user_message.format({
        "id": data[i].id,
        "message": text
      }, "user"));
    } else {
      text = data[i].content;
      messages.appendChild(system_message.format({
        "icon": getIcon(false),
        "id": data[i].id,
        "message": text
      }, "system"));
      typesetMath();
      menuEvent(data[i].id, text);
    }
  }
})

submit.addEventListener("click", () => {
  window.electronAPI.clickSubmit(input.value);
})
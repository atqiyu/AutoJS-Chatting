// script path for windows: d:\Projects\AutojsProject\KS-dome1.js
// script path for android: /sdcard/脚本/KS-dome1.js

auto();
console.show();

const KS_PACKAGE = "com.kuaishou.nebula";
const KS_PACKAGE_IM_PLUGIN = "com.kuaishou.nebula.im_plugin";
// const QYK_AI_API = "http://api.qingyunke.com/api.php?key=free&appid=0&msg=";
const GPT_API_URL = "https://ngedlktfticp.cloud.sealos.io/v1/chat/completions";

const MY_KEY = "sk-LMJ7MwBoQTr7Ij4MF3AfDfA9723c4d2f8b02A2635b4e03C6";
// const GPT_MODEL = ["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];

// use GPT API to generate response
function gpt(input, key, model) {
    // input -- input text
    // key -- GPT API key
    // model -- GPT model

    // DATA -- GPT API request data
    const DATA = {
        messages: [
            {
                role: "user",
                content: String(input)
            }
        ],
        stream: true,
        model: String(model),
        temperature: 0.5,
        presence_penalty: 2
    }
    // HEADERS -- GPT API request headers
    const HEADERS = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
    }

    // send GPT API request and get response
    const r = http.postJson(GPT_API_URL, DATA, { headers: HEADERS });
    
    // parse GPT API response and get result content
    let result = r.body.string().split("\n");
    let result_content = "";  // result content

    // parse GPT API response line by line
    result.forEach(element => {
        if (element.startsWith("data: ")) {
            // remove "data: " prefix
            // length of "data: " prefix is: 6
            if (element.slice(6) == "[DONE]") return; // [DONE] signal end of response content
            // parse JSON data and get result content
            result_content += String(JSON.parse(element.slice(6))['choices'][0]['delta']['content']);
        }
    });

    return result_content;
}

// 获取输入框和发送按钮 <UiObject>
let editor = id(KS_PACKAGE + ":id/editor");
let sendBtn = id(KS_PACKAGE + ":id/send_btn");

let messages_list = [];  // 存储聊天消息

const MY_MESSAGE_BOUNDS_RIGHT = 910;
const OTHER_MESSAGE_BOUNDS_LEFT = 382;

// 获取聊天文本消息
while (true) {

    // 获取消息项目列表  <UiObject List>
    // 获取发送的消息内容列表  <TextView UiObject List>
    let messages_items = id(KS_PACKAGE_IM_PLUGIN + ":id/message_item_root").find();
    let sender_content = messages_items.find(id(KS_PACKAGE + ":id/message"));
    // let sender_name = messages.find(id(KS_PACKAGE_IM_PLUGIN + ":id/sender_name"));
    
    // 消息列表长度内存管理 
    // if (messages_list.length >= 8) {
    //     messages_list = null;
    //     messages_list = [];
    // }

    let command_FLAG_STOP = false;

    // 遍历消息项目列表
    sender_content.forEach( function (text_object) {

        let content_text = text_object.text();  // 文本对象的内容

        // 过滤掉重复消息
        let flag = false;
        messages_list.forEach( function (message) {
            if (message == content_text) {
               flag = true;
               return;
            } 
        });
        if (flag) {
            return;
        } else {
            messages_list.push(content_text);
        }
        
        // 判断自己发送的消息  右边距误差: 8
        if (text_object.bounds().right >= MY_MESSAGE_BOUNDS_RIGHT - 8) {
            if (content_text != "" && content_text.startsWith("#")) {
                content_text = content_text.slice(1);
                log("ME: " + content_text);
                messages_list.push(content_text);
                if (content_text == "STOP") {
                    command_FLAG_STOP = true;
                    return;
                }
                let result_content = gpt(String(content_text), MY_KEY, "gpt-4o-mini");
                log("GPT: " + result_content);
                editor.setText("GPT: " + result_content);
                sendBtn.click();
            }
            return;
        }
        
        if (content_text != "" && content_text.startsWith("#")) {
            
            content_text = content_text.slice(1);
            log(content_text);

            messages_list.push(content_text);
            
            // 调用 GPT API 进行回复
            let result_content = gpt(String(content_text), MY_KEY, "gpt-4o-mini");
            
            log("GPT: " + result_content);
            editor.setText("<收到:\"" + content_text + "\">\n回复: " + result_content);
            // editor.setText(result_content);
            sendBtn.click();
        }
        sleep(300);
    });

    console.assert(command_FLAG_STOP == false, "[STOP command received]");

    // 内存回收
    messages_items = null;
    sender_content = null;

    sleep(600);
    console.warn("[FLUSHED]");
}

import io from 'socket.io-client';


const canvas = document.getElementById("myCanvas");//オセロの盤面を表示するノードを取得する
const ctx = canvas.getContext("2d");//2dで描画するためのメソッドなどを受け取る。
let field;//盤面を保存する配列
let place_able_map;//配置できる場所を保存する配列
let player_id;//サーバーから受け取るidを保存する配列
const max_user_message=25;//表示するユーザー間のメッセージの最大数
const max_server_message=27;//表示するサーバーからのメッセージの最大数


//盤面を描く関数
function drawboard(){
    ctx.fillStyle = 'rgb(0, 97, 48)';
    ctx.fillRect(0, 0, 800, 800)
    
    for(let i=0;i<9;i++){
        ctx.lineWidth ="3"
        ctx.beginPath();
        ctx.moveTo(i*100,0);
        ctx.lineTo(i*100,800);
        ctx.closePath();
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0,i*100);
        ctx.lineTo(800,i*100);
        ctx.closePath();
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }
}

//駒を描く関数
function drawCircle(x,y,color){
    ctx.beginPath();
    ctx.arc(x*100+50, y*100+50, 40, 0, Math.PI*2, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

//配置可能な場所に円を描く関数
function draw_small_Circle(x,y){
    ctx.beginPath();
    ctx.arc(x*100+50, y*100+50, 20, 0, Math.PI*2, false);
    ctx.strokeStyle = 'red';
    ctx.lineWidth ="5"
    ctx.stroke();
    ctx.closePath();
}


//現在のオセロの盤面を描く関数
function drawfield(field){
    drawboard();
    for(let j=0;j<8;j++){
        for(let i=0;i<8;i++){
            if(field[j][i]==1){
                drawCircle(i,j,'white');
            }
            if(field[j][i]==2){
                drawCircle(i,j,'black');
            }

            if(place_able_map[j][i]==1){
                draw_small_Circle(i,j);
            }
        }
    }
}


//メッセージを追加する関数
//引数は、メッセージ、送信元(0ならサーバーから、1なら他のユーザーから)
function add_message(msg,target){
    let element;
    if(target=='user'){
        element=document.getElementById('user_messages');
        let num=element.childNodes.length;
        if(num>max_user_message){
            element.removeChild(element.firstChild);
        }
    }else{
        element=document.getElementById('server_messages');
        let num=element.childNodes.length;
        if(num>max_server_message){
            element.removeChild(element.firstChild);
        }
    }

    let item = document.createElement("p");
    item.textContent = msg;
    element.appendChild(item);
}



//クライアントがブラウザをアンロードしようとした際の処理
window.addEventListener('beforeunload',()=>{
    //サーバーにログアウトの通知を送信する
    socket.emit('logout',{id:player_id});
});


let socket =io();//サーバーとのやり取りのためのsocket.ioの設定


//ここからはサーバーからの通知の受信の処理

//サーバーに接続できた通知を受け取った場合の処理
socket.on('connect', () => {
    console.log('client connected to server');
});

//最初のデータの送信の通知を受けた際の処理
socket.on('firstdata', function(fd,fn){
    console.log("firstdata:",fd);

    //データの受け取り
    field=fd.fld;
    place_able_map=fd.map;
    player_id=fd.id;

    //受け取ったデータをもとに盤面を描画
    drawfield(field);
    
    //サーバーにデータを受け取った旨を返信
    fn('recieved first data!')
    
    //クライアントのブラウザに自信に割り振られたidを表示する
    let element=document.getElementById("user_status");
    element.textContent = "あなたのid:"+player_id;
    
});

//盤面の更新の通知を受けた際の処理
socket.on('changed_field',fd =>{
    //サーバーから送信された盤面のデータを受け取る
    field=fd.fld;
    place_able_map=fd.map;
    drawfield(field);
});

//メッセージの送信の通知を受けた際の処理
socket.on('recieve_message',data=>{
    //サーバーからのメッセージだった場合
    if(data.target==0){
        add_message(data.message,'server');
    }
    //他のユーザーからのメッセージだった場合
    else{
        add_message(data.message,'user');
    }
});

// オセロのプレイヤーの更新の通知を受け取った際の処理
socket.on('changed_player',data=>{
    let element1=document.getElementById("white_player");
    let element2=document.getElementById("black_player");
    if(data[0]!=0){
        element1.textContent="白:ユーザー"+data[0];
    }
    else{
        element1.textContent="白:ユーザー待ち";
    }
    if(data[1]!=0){
        element2.textContent="黒:ユーザー"+data[1];
    }
    else{
        element2.textContent="黒:ユーザー待ち";
    }
});

// ここまでがサーバーからのデータの受信の処理

//ここからがユーザーからサーバーへのデータの送信の処理

//メッセージの送信の処理
const form = document.getElementById("form");
const input = document.getElementById("input");
form.addEventListener('submit',(event)=>{
    event.preventDefault();
    if (input.value) {
        //フォームに入力された情報と自身のidをサーバーに送信する
        socket.emit("user_message", {id:player_id,msg:input.value});
        input.value = "";
      }
});

//オセロの盤面がクリックされた際の処理
let touch = document.getElementById('myCanvas');
touch.addEventListener('click',function(event){
    //サーバーに盤面のクリックされた場所のデータと自身のidを送信する
    socket.emit('clicked',{mX: event.offsetX , mY: event.offsetY,id:player_id});
});






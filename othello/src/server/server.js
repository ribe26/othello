const express = require('express');
const socketio = require('socket.io');

// サーバーの準備
const app = express();
app.use(express.static('dist'));

const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log(`server listening on port ${port}`);

// Socket
const io = socketio(server);

//変数の宣言

let count_id=1;//プレイヤーのidを管理する変数
let players=[0,0];//大戦中のプレイヤーを管理する配列　０要素目が白の人のid　１要素目が黒の人のid
let waiting=[];//参戦待ちの人を管理する配列
let turn=0; //現在のターンを示す変数　0が白　1が黒
let searchwhite=1;//白の人を待っているかのフラグ
let searchblack=1;//黒の人を待っているかのフラグ
let space_exsistence//駒を置く場所があるかのフラグ
let user_message_count=1;//ユーザーメッセージの数を保存しておく変数
let server_message_count=1;//サーバーメッセージの数を保存しておく変数

//盤面を保存する配列
let field =[[0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,1,2,0,0,0],
        [0,0,0,2,1,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0]];

//配置できる場所を表示するための配列
let place_able_map =[[0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0]]

//オセロをひっくり返す処理をするために用いる配列
let direction =[[-1,-1],[0,-1],[1,-1],
                [-1,0] ,[1,0],
                [-1,1],[0,1],[1,1]];


//関数の定義


//現在のターンとは逆の人を返す関数
function opponent(trn){
    if(trn==0){
        return 1;
    }
    else{
        return 0;
    }
}

//オセロの駒を置けるかチェックする関数 引数はチェックしたい座標と、ひっくり返す処理を行うかのフラグ
//配置できる場合は1、できない場合は0を返す
function check_place_able(x,y,reverse){
    let able=0;//配置できるかどうかのフラグ
    let found=0;//配置できる列を見つけたかのフラグ

    //チェックしたい座標から八方位を探索する
    for(let i=0;i<8;i++){
        found=0;//新しい列を確認するためフラグを0にする

        if(field[y][x]!=0){//確認したいマスが空白でなければ処理を終わる
            break;
        }
        //direction配列が示すベクトルの方向の列を探索する
        for(let j=1;j<8;j++){
            //マスの範囲外を探索しようとした場合次の方向に移る
            if((y+(direction[i][1]*j))<0 || (y+(direction[i][1]*j))>7 ||(x+(direction[i][0]*j))<0 || (x+(direction[i][0]*j))>7){
                break;
            }
            //探索中に空白のマス or　相手の駒を挟まずに自分の駒を見つけた場合次の方向の探索に移る
            if((found==0 && field[y+(direction[i][1]*j)][x+(direction[i][0]*j)]==turn+1) || field[y+(direction[i][1]*j)][x+(direction[i][0]*j)]==0){
                break;
            }
            //相手の駒が並んでいる方向を見つけたのでフラグを１にしておく
            else if(field[y+(direction[i][1]*j)][x+(direction[i][0]*j)]==opponent(turn)+1){
                found=1;
            }

            //ひっくり返せる方向を見つけた場合の処理
            else if(found==1 && field[y+(direction[i][1]*j)][x+(direction[i][0]*j)]==turn+1){
                able=1;
                //ひっくり返す処理を行う場合の処理
                if(reverse==1){
                    for(let k=1;k<=j;k++){
                        field[y+(direction[i][1]*k)][x+(direction[i][0]*k)]=turn+1;
                    }
                }
                break;
            }
        }
    }
    return able;    
}


//配置できる場所の一マップを作成する関数
function generate_place_able_map(){
    space_exsistence=0;
    for(let j=0;j<8;j++){
        for(let i=0;i<8;i++){
            place_able_map[j][i]=0;
            if(check_place_able(i,j,0)==1){
                space_exsistence=1;
                place_able_map[j][i]=1;
            }
        }
    }

}

//盤面を初期化する関数
function field_init(){
    turn=0;
    field =[[0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,1,2,0,0,0],
        [0,0,0,2,1,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0]];
}


//ゲームの終了処理をする関数
function gameset(){
    let number_black=0;//黒の数を保存する配列
    let number_white=0;//白の数を保存する配列
    
    //盤面のそれぞれの色の駒の数を数える
    for(let j=0;j<8;j++){
        for(let i=0;i<8;i++){
            if(field[j][i]==1){
                number_white++;
            }
            else if(field[j][i]==2){
                number_black++;
            }
        }
    }
    //白が勝った場合
    if(number_white>number_black){
        //参戦待ちの人がいる場合、負けた人と入れ替える
        if(waiting.length>0){
            waiting.push(players[1]);
            players[1]=waiting[0];
            waiting.shift();
        }
        //ユーザーにメッセージを送る
        emit_message("<"+server_message_count+">"+'白の勝ちです！',0,0);
    
    //黒が勝った場合
    }else if(number_black>number_white){
        //参戦待ちの人がいる場合、負けた人と入れ替える
        if(waiting.length>0){
            waiting.push(players[0]);
            players[0]=waiting[0];
            waiting.shift();
        }
        emit_message("<"+server_message_count+">"+'黒の勝ちです！',0,0);
    //引き分けの場合
    }else{
        emit_message("<"+server_message_count+">"+'引き分けです！',0,0);
    }
    //盤面の初期化をする
    emit_message("<"+server_message_count+">"+'ゲームをリセットします。',0,0);
    init_game();
    reload_player();
}

//全ユーザーにメッセージを送る関数
//引数はメッセージ、送り主がサーバーかユーザーかのフラグ、送り主のid(サーバーであれば0)
function emit_message(msg,trg,me){
    io.emit('recieve_message',{target:trg,message:msg,id:me});
    if(trg==0){
        server_message_count++;
    }
    else{
        user_message_count++;
    }
}

//ゲームの初期化処理
function init_game(){
    field_init();//盤面の初期化
    turn=0;//ターンの初期化
    emit_message("<"+server_message_count+">"+"白のターンです",0,0);
    generate_place_able_map();//配置可能な場所の更新
    emit_field_change();//盤面更新を指示する
}

//クライアントに盤面を更新させる関数
function emit_field_change(){
    io.emit('changed_field',{fld:field,map:place_able_map});
}


//クライアントにプレイヤーの更新を知らせる関数
function reload_player(){
    io.emit("changed_player",players);
}

//ターン更新を行う関数
function change_turn(){
    //ターンの入れ替え
    if(turn==0){
        turn=1;
    }else{
        turn=0;
    }
    //クライアントに現在のターンを知らせる。
    if(turn){
        emit_message("<"+server_message_count+">"+"黒のターンです",0,0);
    }else{
        emit_message("<"+server_message_count+">"+"白のターンです",0,0);
    }
}

//ゲームを開始できるかを確認する関数
function check_ready(){
    if(players[0]!=0 && players[1]!=0){
        //プレイヤーが揃っていればゲームを初期化する。
        init_game();
    }
}


//ここからがクライアントとの通信の処理

//ユーザーとのやり取りを行う
io.on('connection', socket => {

    //ここから接続した際の初期処理

    console.log('player connected', socket.id);
    //オセロのプレイヤーが足りない場合の処理
    //白の人がいない場合
    if(searchwhite==1){
        players[0]=count_id;
        searchwhite=0;
        reload_player();
        check_ready();
    }
    //黒の人がいない場合
    else if(searchblack==1){
        players[1]=count_id;
        searchblack=0;
        reload_player();
        check_ready();
    }
    //オセロのプレイヤーが足りている場合、参戦待ちに追加しておく
    else{
        waiting.push(count_id);
    }

    console.log('player number:',count_id);

    //最初のデータをクライアントに送信する。
    //送信するデータは、盤面、配置可能な場所、割り振られたid
    socket.emit('firstdata',{fld:field ,map:place_able_map,id:count_id,},function(data){
        reload_player();
        console.log('responsed!:',data);
    });

    count_id++;//使用済みidを更新する


    //ここまでが接続の初期処理

    //ここからはサーバーとクライアントのやり取りの処理


    //ユーザーが盤面をクリックした通知を受けた際の処理
    socket.on('clicked', fd =>{
        console.log("clicked!");

        //クリックした人が現在のターンの人の場合の処理
        if(fd.id==players[turn]){
            //クリックした座標を受け取る
            let flx = parseInt(fd.mX/100);
            let fly = parseInt(fd.mY/100);

            //クリックした座標が駒を配置できる場合の処理
            if(place_able_map[fly][flx]==1){
                check_place_able(flx,fly,1);//ひっくり返す
                field[fly][flx]=turn+1;//駒を置く
                change_turn();//ターンを更新
                generate_place_able_map();//配置できる場所を更新

                //次のターンの人が駒を置く場所がない場合の処理
                if(space_exsistence==0){
                    //再度ターンを更新
                    change_turn();
                    generate_place_able_map();
                    //それでも置く場所が無い場合ゲームが終了しているので、ゲームの終了処理を行う
                    if(space_exsistence==0){
                        gameset();
                    }
                }
                emit_field_change();
            }
            console.log('clicked!');
            console.log('mouse:',fd);
            console.log('mouseX:',flx);
            console.log('mouesY:',fly);
        }
    });
    
    //ユーザーかログアウトした通知を受け取った際の処理
    socket.on('logout',data=>{
        console.log('logouted');

        //ログアウトした人がオセロのプレイヤーだった場合の処理
        //白の人がログアウトした場合の処理
        if(players[0]==data.id){
            //参戦待ちの人がいれば入れ替えsる
            if (waiting.length>0){
                players[0]=waiting[0];
                waiting.shift();
            }
            //いなければ新たなユーザーがアクセスするのを待つ
            else{
                searchwhite=1;
                players[0]=0;
            }
            check_ready();
            emit_field_change();
            reload_player();
        }

        //黒の人がログアウトした場合も同様の処理
        if(players[1]==data.id){
            if (waiting.length>0){
                players[1]=waiting[0];
                waiting.shift();
            }
            else{
                searchblack=1;
                players[1]=0;
            }
            check_ready();
            emit_field_change();
            reload_player();
        }
        //参戦待ちの人がログアウトした場合、参戦待ちの配列から削除しておく
        else{
            let num=waiting.indexOf(data.id);
            waiting.splice(num,num);
        }
    });

    //ユーザーからメッセージ送信の通知を受けた際の処理
    socket.on("user_message",data=>{
        //受け取ったメッセージを処理して、全ユーザーに通知する
        let message = "<"+user_message_count+">"+"ユーザー"+data.id+":"+data.msg;
        emit_message(message,1,data.id)
    });

    //プレイヤーが完全に切断した通知を受けた際の処理
    socket.on('disconnect', () => {
        console.log('player disconnected');
    });
});



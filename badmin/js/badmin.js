
window.onerror = function(msg, url, linenumber) {
     console.error('Error message: '+msg+'\nURL: '+url+'\nLine number: '+linenumber);
 };

var PbxObject = PbxObject || {};


$(document).ready(function(){    

    createWebsocket();
    init_page();
    setPageHeight();
    getTranslations();

});

function createWebsocket(){

    var protocol = (location.protocol === 'http:') ? 'ws:' : 'wss:';
    PbxObject.websocket = new WebSocket(protocol + '//'+window.location.host+'/','json.api.smile-soft.com'); //Init Websocket handshake
    PbxObject.websocket.onopen = function(e){
        console.log('WebSocket opened');
        PbxObject.websocketTry = 1;

    };
    PbxObject.websocket.onmessage = function(e){
        console.log(e);
        handleMessage(e.data);
    };
    PbxObject.websocket.onclose = function(){
        console.log('WebSocket closed');
        var time = generateInterval(PbxObject.websocketTry);
        setTimeout(function(){
            PbxObject.websocketTry++
            createWebsocket();
        }, time);
    };

}
//Reconnection Exponential Backoff Algorithm taken from http://blog.johnryding.com/post/78544969349/how-to-reconnect-web-sockets-in-a-realtime-web-app
function generateInterval (k) {
    var maxInterval = (Math.pow(2, k) - 1) * 1000;
  
    if (maxInterval > 30*1000) {
        maxInterval = 30*1000; // If the generated interval is more than 30 seconds, truncate it down to 30 seconds.
    }
  
    // generate the interval to a random number between 0 and the maxInterval determined from above
    return Math.random() * maxInterval; 
}

function json_rpc(method, params){
    var jsonrpc;
    if(params == null){
        jsonrpc = '{\"method\":\"'+method+'\", \"id\":'+1+'}';
    }
    else{
        jsonrpc = '{\"method\":\"'+method+'\", \"params\":{'+params+'}, \"id\":'+1+'}';
    }
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/", false);
    xmlhttp.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xmlhttp.send(jsonrpc);
    var parsedJSON = JSON.parse(xmlhttp.responseText);
    if(parsedJSON.error != undefined){
        if(parsedJSON.error.code == 404 || parsedJSON.error.code == 406) {
            return;
        }
    }
    return parsedJSON.result;
}

function json_rpc_async(method, params, handler, id){
    var jsonrpc;
    if(params)
        jsonrpc = '{\"method\":\"'+method+'\", \"params\":{'+params+'}, \"id\":'+1+'}';
    else
        jsonrpc = '{\"method\":\"'+method+'\", \"id\":'+1+'}';

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/", true);

    var requestTimer = setTimeout(function(){
        xhr.abort();
        notify_about('info' , PbxObject.frases.timeout[PbxObject.lang]);
        show_content();
    }, 30000);
    xhr.onreadystatechange = function() {
        if (xhr.readyState==4){
            clearTimeout(requestTimer);
            if(xhr.status != 200) {
                notify_about('error', PbxObject.frases.error[PbxObject.lang]);
                show_content();
            };
            if(xhr.response) {
                var parsedJSON = JSON.parse(xhr.response);
                if(parsedJSON.error != undefined){
                    notify_about('error' , parsedJSON.error.message);
                    show_content();
                }
                else if(parsedJSON.result){
                    if(handler != null) {
                        handler(parsedJSON.result);
                    }
                }
            }
        }
    };

    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(jsonrpc);
}

function getTranslations(){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/badmin/translations/translations.json', true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == "200") {            
            var data = JSON.parse(xhr.responseText);
            loadTranslations(data);
          }
    };
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send();  
    

}

function sendData(method, params, id){

    var data = {};
    data.method = method;
    if(params) data.params = params;
    if(id) data.id = id;

    data = JSON.stringify(data);

    PbxObject.websocket.send(data);

}

function loadTranslations(result){
    PbxObject.frases = result;
}

function setPageHeight(){
    $('#pagecontent').css('min-height', function(){
        return $(window).height();
    });
}

function changeOnResize(isSmall){
    if(PbxObject.smallScreen !== isSmall){
        if(isSmall){
            if($('#pagecontent').hasClass('squeezed-right')){
                $('#pagecontent').removeClass('squeezed-right');
            }
            if($('#pbxmenu').hasClass('squeezed-menu')){
                $('#pbxmenu').removeClass('squeezed-menu');
            }
        }
        else{
            if(!($('#pagecontent').hasClass('squeezed-right'))){
                $('#pagecontent').addClass('squeezed-right');
            }
        }
        PbxObject.smallScreen = isSmall;
    }
}

function loadOptions(result){

    var options = JSON.stringify(result), 
        language = result.lang || 'en';

    window.sessionStorage.setItem('pbxLanguage', language);
    window.sessionStorage.setItem('pbxOptions', options);

    init_page();

}

function handleMessage(data){
    var data = JSON.parse(data),
        method = data.method;
    if(data.method){ //if the message content has no "id" parameter, i.e. sent from the server without request
        var params = data.params;
        if(method == 'stateChanged'){
            if(params.hasOwnProperty('ext'))
                updateExtension(params);
        }
        else if(method == 'objectCreated'){
            addNewObject(params);
        }
    }
    else{
        callbackOnId(data.id, data.result);
    }
}

function callbackOnId(id, result){

    if(id == 5){
        PbxObject.CallsBoard.setCurrentCalls(result);
    }
    else if(id == 6){
        PbxObject.CallsBoard.setCurrentState(result);
    }

}

function init_page(){

    json_rpc_async('getPbxOptions', null, load_pbx_options);

    PbxObject.lang = window.sessionStorage.getItem('pbxLanguage');
    PbxObject.smallScreen = isSmallScreen();

    $(window).resize(function(){
        setPageHeight();
        changeOnResize(isSmallScreen());
    });

    if(!isSmallScreen()) {
        $('#pagecontent').addClass('squeezed-right');
    }
    if($(window).width() > 767 && $(window).width() < 959) {
        $('#pbxmenu').addClass('squeezed-menu');
        $('#pagecontent').removeClass('squeezed-right');
    }
    
    //set default loading page
    if(!location.hash.substring(1))
        location.hash = 'calls';
    
    get_object();
    setTimeout(function(){set_listeners();}, 1000);

}

function set_listeners(){

    addEvent(window, 'hashchange', get_object);
    $('.sidebar-toggle', '#pagecontent').click(toggle_sidebar);
    $('.options-open', '#pagecontent').click(open_options);
    $('.options-close', '#pbxoptions').click(close_options);

    $('#pbxmenu li a').click(function() {
        var parent = $(this).parent();
        var kind = $(this).attr('data-kind');
        if(kind && !parent.hasClass('active')){
            var ul = document.createElement('ul');
            ul.id = 'ul-'+kind;
            var result = json_rpc('getObjects', '\"kind\":\"'+kind+'\"');
            var li = document.createElement('li');
            li.className = 'add-group-object';
            var a = document.createElement('a');
            if(kind == 'application') {
                var inp = document.createElement('input');
                inp.type = "file";
                inp.id = "uploadapp";
                inp.className = "upload-custom";
                inp.accept = ".application";
                addEvent(inp, 'change', function(){
                    upload('uploadapp');
                });
                li.appendChild(inp);
                a.href = '#';
                addEvent(a, 'click', function(e){
                    document.getElementById('uploadapp').click();
                    if(e) e.preventDefault;
                });
            }
            else{
                a.href = '#'+kind;
            }
            a.innerHTML ='<i class="glyphicon glyphicon-plus"></i><span>Add</span>';
            li.appendChild(a);
            ul.appendChild(li);
            var i, gid, name, li, a, rem;
            for(i=0; i<result.length; i++){
                gid = result[i].oid;
                name = result[i].name;
                li = document.createElement('li');
                a = document.createElement('a');
                a.href = '#'+kind+'?'+gid;
                a.innerHTML = name;
                li.appendChild(a);
                ul.appendChild(li);
            }
            $(this).siblings().remove('ul');
            parent.append(ul);
        }

        parent.siblings('li.active').removeClass('active').children('ul:visible').slideUp('normal');
        parent.addClass('active'); 

        var checkElement = $(this).next();
        if((checkElement.is('ul')) && (checkElement.is(':visible'))) {
            parent.removeClass('active');
            checkElement.slideUp('normal');

        }
        if((checkElement.is('ul')) && (!checkElement.is(':visible'))) {
            checkElement.slideDown('normal');
        }

        if(parent.find('ul').children().length == 0) {
            return true;
        } else {
            return false; 
        }
    }); 
}

function get_object(result){

    var query = location.hash.substring(1),
        obj = query.indexOf('?') != -1 ? query.substring(0, query.indexOf('?')) : query.substring(0),
        oid = query.indexOf('?') != -1 ? query.substring(query.indexOf('?')+1) : obj, //if no oid in query then set kind as oid
        lang = PbxObject.lang,
        callback = null,
        fn = null;
        
    if(query === PbxObject.query) return;    
    if(query != ''){

        PbxObject.query = query;
        PbxObject.obj = obj;
        PbxObject.oid = oid;

        $('#dcontainer').addClass('faded');

        // show_loading_panel();

        var modal = document.getElementById('el-extension');
        if(modal) modal.parentNode.removeChild(modal);

        if(obj == 'equipment' || obj == 'unit' || obj == 'users' || obj == 'icd' || obj == 'hunting' || obj == 'conference' || obj == 'pickup'){
            obj = 'bgroup';
        }

        callback = 'load_' + obj;
        fn = window[callback];
//        var url = '/badmin/js/'+query+'.js';
//        $.getScript(url, function(){

            $("#dcontainer").load('/badmin/'+lang+'/'+obj+'.html', function(){
                if(obj == 'extensions'){
                    // if(PbxObject.extensions)
                    //     load_extensions(PbxObject.extensions);
                    // else
                        json_rpc_async('getExtensions', null, fn);
                }
                else if(obj == 'calls' || obj == 'records'){
                    fn();
                }
                else {
                    json_rpc_async('getObject', '\"oid\":\"'+oid+'\"', fn);
                }
                $('#dcontainer').scrollTop(0);
                $('.squeezed-menu > ul').children('li.active').removeClass('active').children('ul:visible').slideUp('normal');
            });
//        });
    }
}

function set_page(){
    var kind = PbxObject.kind;
    if(kind != 'extensions' && kind != 'trunk' && kind != 'application' && kind != 'cli' && kind != 'routes' && kind != 'timer'){
            kind = 'bgroup';
        }
    // var chk = document.getElementsByClassName('delall'),
    var trow = document.querySelectorAll('.transrow'),
        clirow = document.querySelectorAll('.clirow'),
        rtrow = document.querySelectorAll('.routerow'),
        // approw = document.querySelectorAll('.approw'),
        so = document.getElementById('el-set-object'),
        delobj = document.getElementById('el-delete-object'),
        handler = 'set_'+kind,
        fn = window[handler];

    // if(chk.length){
    //     for(var i=0;i<chk.length;i++){
    //         addEvent(chk[i], 'change', check_all_rows);
    //     }
    // }
    if(trow.length){
        for(i=0;i<trow.length;i++){
            addEvent(trow[i], 'click', append_transform);
        }
    }
    if(clirow.length){
        for(i=0;i<clirow.length;i++){
            addEvent(clirow[i], 'click', add_cli_row);
        }
    }
    if(rtrow.length){
        for(i=0;i<rtrow.length;i++){
            addEvent(rtrow[i], 'click', add_route);
        }
    }
    // if(approw.length){
    //     for(i=0;i<approw.length;i++){
    //         addEvent(approw[i], 'click', add_app_row);
    //     }
    // }

    if(so){
        so.onclick = function(){
            fn();
        };
    }
    if(delobj){
        if(PbxObject.name){
            delobj.onclick = function(e){
                delete_object(e, PbxObject.name, PbxObject.kind, PbxObject.oid);
            };
        }
        else delobj.setAttribute('disabled', 'disabled');
    }

    if(kind == 'hunting' || kind == 'icd' || kind == 'unit' || kind == 'routes'){
        var sortable = document.getElementsByClassName('el-sortable');
        for(var i=0;i<sortable.length;i++){
            new Sortable(sortable[i]);
        }
    }

    $('div.panel-header').click(toggle_panel);

}

function toggle_sidebar(e){    

    if(e) e.preventDefault();

    $('#pagecontent').toggleClass('squeezed-right');
    $('#pbxmenu').toggleClass('squeezed-right');
    if(!isSmallScreen())
        toggle_menu();
    
    
//    if(isSmallScreen()){
//        if($('#pagecontent').hasClass('squeezed-right')){
//            $('html, body').css({
//                'overflow': 'hidden',
//                'height': '100%'
//            });
//        }
//        else{
//            $('html, body').css({
//                'overflow': 'auto',
//                'height': 'auto'
//            });
//        }
//    }
}

function toggle_menu(){
    $('#pbxmenu').toggleClass('squeezed-menu');
}

function open_options(e){
    // get_pbx_options();
    // $(this).off('click');
    // $(this).addClass('spinner');
    // $('#pbxoptions').addClass('top-layer');
    if(e) e.preventDefault();
    toggle_presentation();
}
function close_options(e){
    // $('.options-open', '#pagecontent').click(open_options);
    $('#pagecontent').removeClass('pushed-left');
    $('#pbxoptions').removeClass('pushed-left');
    $('#el-slidemenu').removeClass('hide-menu');
    setTimeout(function(){
       $('#pbxoptions').removeClass('top-layer');
       $('#el-options-content').remove();
    }, 500);
    if(e) e.preventDefault();
}

function toggle_panel(e){
    e.preventDefault();
    var $panel = $(this).closest('.panel'),
        $el = $panel.find('.panel-body');

    $panel.toggleClass('minimized');
    $el.slideToggle();
}

function toggle_presentation() {
    $('#el-slidemenu').addClass('hide-menu');
    // $('.options-open', '#pagecontent').removeClass('spinner');
    $('#pagecontent').addClass('pushed-left');
    $('#pbxoptions').addClass('pushed-left');
    $('.tab-switcher', '#pbxoptions').click(function(e) {
        var e = e || window.event;
        switch_options_tab($(this).attr('data-tab'));
        e.preventDefault();
    });
}

function show_loading_panel(){
    if(document.getElementById('el-loading')) return;
    var back = document.createElement('div');
    back.id = 'el-loading';
    back.className = 'el-loading-panel ';
    var load = document.createElement('img');
    load.src = '/badmin/images/sprites_white.png';
    load.className = 'loader';
    var cont = document.getElementById('pagecontainer');
    back.appendChild(load);
    cont.appendChild(back);    
}

function show_content(){
    var loading = document.getElementById('el-loading');
    if(loading) loading.parentNode.removeChild(loading);

    if(isSmallScreen() && $('#pagecontent').hasClass('squeezed-right')) {
        $('#pagecontent').toggleClass('squeezed-right');
        $('#pbxmenu').toggleClass('squeezed-right');
    }
    $('#dcontainer').removeClass('faded');

}

function switch_tab(tabid){
    var div = document.getElementById(tabid);
    var parent = div.parentNode.parentNode;
    var childs = parent.children;
    for(var i=0;i<childs.length;i++){
        if(childs[i].children[0].id != tabid) {
            childs[i].style.display = 'none';  
        }
        else childs[i].style.display = '';
    }
}

function switch_options_tab(tabid){
    var div = document.getElementById(tabid),
        parent = div.parentNode,
        childs = parent.children;
    for(var i=1;i<childs.length;i++){
        if(childs[i].id != tabid) {
            childs[i].style.display = 'none';   
        }
        else childs[i].style.display = '';
    }
}

function filter_table(event){
    var event = event || window.event;
    var text, val, row,
        input = event.target,
        tid = input.getAttribute('data-table'),
        table = document.getElementById(tid);
        val = input.value.toLowerCase();
    for(var i=1; i<table.rows.length; i++){
        row = table.rows[i];
        text = row.textContent.toLowerCase();
        row.style.display = text.indexOf(val) === -1 ? 'none' : 'table-row';
    }
}

function notify_about(status, message){
    var notifyUp, 
        ico, 
        cls, 
        body = document.getElementsByTagName('body')[0];
    switch(status){
        case 'success':
            ico = '<span class="glyphicon glyphicon-ok"></span>';
            cls = 'el-notifier-ok';
            break;
        case 'error':
            ico = '<span class="glyphicon glyphicon-remove"></span>';
            cls = 'el-notifier-error';
            break;
        default:
            ico = '<span class="glyphicon glyphicon-exclamation-sign"></span>';
            cls = 'el-notifier-info';
    }

    var div = document.createElement('div');
    div.className = 'el-notifier '+cls;
    div.innerHTML = message+' '+ico;
    body.appendChild(div);
    notifyUp = setTimeout(function(){
        body.removeChild(div);
    }, 5000);
}

function append_transform(e, tableid, transform){
    var table, tbody, cell, lrow, div, inp;

    if(tableid){
        table = document.getElementById(tableid);        
    } else if(e && e.type == 'click') {
        var e = e || window.event,
            targ = e.target || e.srcElement;
        e.preventDefault();
        table = getClosest(targ, 'table');
    } else {
        return;
    }

    console.log(tableid+' '+e);

    tbody = table.querySelector('tbody');
    lrow = tbody.rows.length,
    row = tbody.insertRow(lrow);

    // var tr = document.createElement('tr');
    // var td = document.createElement('td');
    cell = row.insertCell(0);
    // tr.appendChild(td);
    div = document.createElement('div');
    div.className = 'form-group';
    inp = document.createElement('input');
    inp.className = 'form-control';
    inp.setAttribute('type', 'text');
    inp.setAttribute('name', 'number');
    if(transform != null) {
        inp.setAttribute('value', transform.number);
    }
    div.appendChild(inp);
    cell.appendChild(div);

    cell = row.insertCell(1);
    cell.setAttribute('align', 'center');
    div = document.createElement('div');
    div.className = 'form-group';
    inp = document.createElement('input');
    inp.setAttribute('type', 'checkbox');
    inp.setAttribute('name', 'strip');
    if(transform != null) {
        inp.checked = transform.strip;
    }
    div.appendChild(inp);
    cell.appendChild(div);

    cell = row.insertCell(2);
    div = document.createElement('div');
    div.className = 'form-group';
    inp = document.createElement('input');
    inp.className = 'form-control';
    inp.setAttribute('type', 'text');
    inp.setAttribute('name', 'prefix');
    if(transform != null) {
        inp.setAttribute('value', transform.prefix);
    }
    div.appendChild(inp);
    cell.appendChild(div);

    cell = row.insertCell(3);
    div = document.createElement('div');
    div.className = 'form-group';
    inp = document.createElement('a');
    inp.href = '#';
    inp.className = 'remove-clr';
    inp.innerHTML = '<i class="glyphicon glyphicon-remove"></i>';
    // cell = document.createElement('input');
    // cell.setAttribute('type', 'checkbox');
    // cell.className = 'delall';
    addEvent(inp, 'click', remove_row);
    div.appendChild(inp);
    cell.appendChild(div);
    // tr.appendChild(td);

    // tbody.appendChild(tr);    
}

function clear_transforms(tables){
    var i, j, table;
    for(i=0; i<tables.length;i++){
        table = document.getElementById(tables[i]);
        for(j=table.rows.length-1;j>1;j--){
            table.deleteRow(j);
        }
    }
}

// function delete_rows(e){
//     var e = e || window.event,
//         targ = e.target || e.srcElement;
//     if(targ && targ.nodeType == 3) {
//         targ = targ.parentNode;
//     }
//     var table, tbody;

//     var node = targ.parentNode;
//     while(node != null){
//         if(node.nodeName.toLowerCase() == 'table') {
//             table = document.getElementById(node.id);
//             break;
//         }
//         node = node.parentNode;
//     }

//     var tbody = table.getElementsByTagName('tbody')[0],
//     delall = table.getElementsByClassName('delall')[0];

//     var i = tbody.children.length;
//     while(i--){
//         var child = tbody.children[i];
//         var del = child.getElementsByClassName('delall')[0];
//         if(del.checked) tbody.removeChild(child);
//     }

//     if(delall.checked) delall.checked = false;
//     change_handler(node.id);
// }

function encode_transforms(tableid){
    var table = document.getElementById(tableid).getElementsByTagName('tbody')[0];
    var jprms = '';
    var i = table.children.length;
    while(i--){
        var tr = table.children[i];
        var inp = tr.getElementsByTagName('input');
        var l = inp.length;

        jprms += '{';
        while(l--){
            if(inp[l].name == 'number'){
                jprms += '\"number\":\"'+inp[l].value+'\",';
            }
            else if(inp[l].name == 'strip'){
                jprms += '\"strip\":'+inp[l].checked+',';
            }
            else if(inp[l].name == 'prefix'){
                jprms += '\"prefix\":\"'+inp[l].value+'\",';
            }
        }
        jprms += '},';
    }
    return jprms;
}

function remove_row(e){

    e.preventDefault();
    var el = this.parentNode, row;
    while(el.nodeName != 'TBODY'){
        if(el.nodeName == 'TR'){
            row = el;
        }
        el = el.parentNode;
    }
    el.removeChild(row);

}

// function check_all_rows(e){
//     var e = e || window.event;
//     var targ = e.target || e.srcElement;
//     if(targ.nodeType == 3) {
//         targ = targ.parentNode;
//     }

//     var node = targ.parentNode;
//     while(node != null){
//         if(node.nodeName.toLowerCase() == 'table') {
//             var tableid = node.id;
//             break;
//         }
//         node = node.parentNode;
//     }

//     var table = document.getElementById(tableid),
//         chk = table.getElementsByClassName(this.className),
//         ischk = this.checked;

//     for(var i=0;i<chk.length;i++){
//         chk[i].checked = ischk;
//     }

//     change_handler(tableid);
// }

// function change_handler(tableid){
//     var c, i, handler, cl, o = 0;

//     if(tableid == 'rtable'){
//         handler = add_route;
//         cl = 'routerow';
//     }
//     else if(tableid == 'clinumbers'){
//         handler = add_cli_row;
//         cl = 'clirow';
//     }
//     else if(tableid == 'appvariables'){
//         handler = add_app_row;
//         cl = 'approw';
//     }
//     else{
//         handler = append_transform;
//         cl = 'transrow';
//     }

//     var table = document.getElementById(tableid),
//         th = table.getElementsByClassName(cl)[0],
//         ico = th.firstChild,
//         chk = table.getElementsByClassName('delall');

//     for(i=0;i<chk.length;i++){
//         if(chk[i].checked) o += 1;
//     }
//     if(ico.className.match( /(?:^|\s)glyphicon-plus(?!\S)/g)){
//         c = 'glyphicon-minus';
//         removeEvent(th, 'click', handler);
//         addEvent(th, 'click', delete_rows);
//         th.style.color = '#d43f3a';
//     }
//     else{
//         if(o>0) {
//             return;
//         }
//         else {
//             c = 'glyphicon-plus';
//             removeEvent(th, 'click', delete_rows);
//             addEvent(th, 'click', handler);
//             th.style.color = '';
//         }
//     }
//     ico.className = 'glyphicon ' + c;
// }

// function set_new_object(){
//     var load = document.getElementById('el-loading');
//         okind = PbxObject.kind, 
//         oname = PbxObject.name, 
//         ooid = PbxObject.oid,
//         ul = document.getElementById('ul-'+okind);

//     if(load) load.parentNode.removeChild(load);

//     location.hash = okind+'?'+ooid;
//     if(ul){
//         var li = document.createElement('li'),
//             a = document.createElement('a');
//         a.href = '#'+okind+'?'+ooid;
//         a.innerHTML = oname;
//         li.appendChild(a);
//         ul.appendChild(li);
//     }
//     notify_about('success', oname+' '+PbxObject.frases.created[PbxObject.lang]);

// }

function addNewObject(data){

    var ul = document.getElementById('ul-'+data.kind),
        load = document.getElementById('el-loading');
    if(load) load.parentNode.removeChild(load);

    PbxObject.query = data.kind+'?'+data.oid;
    // window.location.hash = data.kind+'?'+data.oid;

    if(ul){
        var li = document.createElement('li'),
            a = document.createElement('a');
        a.href = '#'+data.kind+'?'+data.oid;
        a.innerHTML = data.name;
        li.appendChild(a);
        ul.appendChild(li);
    }

    notify_about('success', data.name+' '+PbxObject.frases.created[PbxObject.lang]);

}

function addGroups(kind){

}

function set_object_success(){
    var load = document.getElementById('el-loading');
    if(load) load.parentNode.removeChild(load);

    notify_about('success', PbxObject.frases.saved[PbxObject.lang]);
}

function set_options_success() {
    var i, newpath = '', parts = window.location.pathname.split('/');
    for (i = 0; i < parts.length; i++) {
        if (parts[i] === 'en' || parts[i] === 'uk' || parts[i] === 'ru') {
            parts[i] = PbxObject.lang;
        }
        newpath += '/';
        newpath += parts[i];
    }
    var newURL = window.location.protocol + "//" + window.location.host + newpath.substring(1);
    window.location.href = newURL;
}

function delete_object(e, name, kind, oid){
    var e = e || window.event;
    if(e.type == 'click')
        e.preventDefault(); 
    var c = confirm(PbxObject.frases.doDelete[PbxObject.lang]+' '+name+'?');
    if (c){
        var ul = document.getElementById('ul-'+kind);
        if(ul){
            var li, href;
            for(var i=0;i<ul.children.length;i++){
                li = ul.children[i];
                href = li.children[0].href;
                if(href && href.substring(href.indexOf('?')+1) == oid){
                    ul.removeChild(li);
                }
            }
        }
        json_rpc('deleteObject', '\"oid\":\"'+oid+'\"');
        if(oid === PbxObject.oid) window.location.hash = kind;
    }
    else{
        return false;
    }
}

function delete_extension(e){
    var row = getClosest(e.target, 'tr'),
        table = row.parentNode;
        ext = row.id,
        anchor = row.querySelector('a');
        group = row.cells[2].textContent,
        msg = PbxObject.frases.doDelete[PbxObject.lang] + ' ' + ext + ' ' +PbxObject.frases.from[PbxObject.lang] + ' ' + group + '?',
        c = confirm(msg);

    if (c){
        anchor.removeAttribute('href');
        removeEvent(anchor, 'click', get_extension);
        var oid = row.getAttribute('data-oid');
        json_rpc_async('deleteObject', '\"oid\":\"'+oid+'\"', null);
        
        newRow = createExtRow(ext);
        newRow.className = 'active';
        table.insertBefore(newRow, row);
        table.removeChild(row);
    }
    else{
        return false;
    }
}

function customize_upload(id, resultFilename){
    var upl = document.getElementById(id),
        uplparent = upl.parentNode,
        uplbtn = document.createElement('button'),
        uplname = document.createElement('span');
    if(resultFilename !== null) uplname.innerHTML = ' '+resultFilename;
    uplbtn.type = 'button';
    uplbtn.className = 'btn btn-default btn-sm';
    uplbtn.innerHTML = 'Upload';
    uplbtn.onclick = function(){
        upl.click();
    };
    uplparent.insertBefore(uplbtn, upl);
    uplparent.insertBefore(uplname, upl);
    upl.onchange = function(){
        if(this.files.length)
            uplname.innerHTML = ' '+this.files[0].name;
        else
            uplname.innerHTML = ' ';
    };
}

function upload(inputid){
    var upload = document.getElementById(inputid);
    var filelist = upload.files;
    if(filelist.length == 0){
        return false;
    }
    var file = filelist[0];
    var xmlhttp = new XMLHttpRequest();
    var requestTimer = setTimeout(function(){
        xmlhttp.abort();
        notify_about('info', PbxObject.frases.timeout[PbxObject.lang]);
    }, 30000);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4){
            clearTimeout(requestTimer);
            if(xmlhttp.status != 200) {
                notify_about('error', PbxObject.frases.error[PbxObject.lang]);
            }
            else{
                if(upload == 'uploadapp') {
                    notify_about('success' , file.name+' '+PbxObject.frases.uploaded[PbxObject.lang]);
                }
            }
        }
    };
    xmlhttp.open("PUT", "/", true);
    xmlhttp.setRequestHeader("X-File-Name", file.name);
    xmlhttp.setRequestHeader("X-File-Size", file.size);
    xmlhttp.send(file);
}

function get_object_link(oid){
    var result = json_rpc('getObject', '\"oid\":\"'+oid+'\"');   
    location.hash = result.kind+'?'+oid;
}

// function get_pbx_options(){
//     var url = '/badmin/js/options.js';
//     $.getScript(url, function(){
//         json_rpc_async('getPbxOptions', null, load_pbx_options);
//     });
// }

function isSmallScreen(){
    return $(window).width() < 768;
}

function getClosest(elem, selector) {

    var firstChar = selector.charAt(0);

    // Get closest match
    for ( ; elem && elem !== document; elem = elem.parentNode ) {
        if ( firstChar === '.' ) {
            if ( elem.classList.contains( selector.substr(1) ) ) {
                return elem;
            }
        } else if ( firstChar === '#' ) {
            if ( elem.id === selector.substr(1) ) {
                return elem;
            }
        } else if ( firstChar === '[' ) {
            if (elem.hasAttribute( selector.substr(1, selector.length - 2))) {
                return elem;
            }
        } else {
            if(elem.nodeName === selector.toUpperCase()){
                return elem;
            }
        }
    }

    return false;

};

function addEvent(obj, evType, fn) {
  if (obj.addEventListener) obj.addEventListener(evType, fn, false); 
  else if (obj.attachEvent) obj.attachEvent("on"+evType, fn); 
}
function removeEvent(obj, evType, fn) {
  if (obj.removeEventListener) obj.removeEventListener(evType, fn, false); 
  else if (obj.detachEvent) obj.detachEvent("on"+evType, fn); 
}

function load_pbx_options(result) {
    
    var options, chk, trow, tables, transforms, so;

    switch_options_tab('mainopt-tab');

    PbxObject.oidOptions = result.oid;

    if (result.lang) {
        var select = document.getElementById('interfacelang'),
                i = select.options.length - 1;
        while (i >= 0) {
            if (select.options[i].value === result.lang) {
                select.options[i].selected = true;
            }
            i--;
        }
    }
    if (result.name)
        document.getElementById('branchname').value = result.name;
    if (result.branchid)
        document.getElementById('branchid').value = result.branchid;
    if (result.maxlines) {
        var maxint = parseInt('0x7fffffff', 16);
        if (result.maxlines < maxint) {
            document.getElementById('limconn').checked = true;
            document.getElementById('maxlines').value = result.maxlines;
        }
        else {
            document.getElementById('unlimconn').checked = true;
            document.getElementById('maxlines').value = '';
        }
    }

    //customizing upload element
    customize_upload('musonhold', result.options.holdmusicfile);

    if (result.options) {
        document.getElementById('holdreminterv').value = result.options.holdremindtime || '';
        document.getElementById('holdrectime').value = result.options.holdrecalltime || '';
        document.getElementById('transrectime').value = result.options.transferrecalltime || '';
        document.getElementById('transrecdest').value = result.options.transferrecallnumber || '';
        document.getElementById('autoretrieve').checked = result.options.autoretrive;
        document.getElementById('parkrectime').value = result.options.parkrecalltime || '';
        document.getElementById('parkrecdest').value = result.options.parkrecallnumber || '';
        document.getElementById('discontime').value = result.options.parkdroptimeout || '';
    }

    options = document.getElementById('pbxoptions');
    // chk = options.getElementsByClassName('delall');
    // for (var i = 0; i < chk.length; i++) {
    //     addEvent(chk[i], 'change', check_all_rows);
    // }

    trow = options.getElementsByClassName('transrow');
    for (i = 0; i < trow.length; i++) {
        addEvent(trow[i], 'click', append_transform);
    }

    tables = ['transforms5', 'transforms6', 'transforms7', 'transforms8'];
    clear_transforms(tables);

    transforms = result.localtrunk.inboundanumbertransforms;
    if (transforms.length) {
        for (i = 0; i < transforms.length; i++) {
            append_transform(null, 'transforms5', transforms[i]);
        }
    }
    transforms = result.localtrunk.inboundbnumbertransforms;
    if (transforms.length) {
        for (i = 0; i < transforms.length; i++) {
            append_transform(null, 'transforms6', transforms[i]);
        }
    }
    transforms = result.localtrunk.outboundanumbertransforms;
    if (transforms.length) {
        for (i = 0; i < transforms.length; i++) {
            append_transform(null, 'transforms7', transforms[i]);
        }
    }
    transforms = result.localtrunk.outboundbnumbertransforms;
    if (transforms.length) {
        for (i = 0; i < transforms.length; i++) {
            append_transform(null, 'transforms8', transforms[i]);
        }
    }

    so = document.getElementById('el-set-options');
    so.onclick = set_pbx_options;

    // toggle_presentation();
}

function set_pbx_options(e) {

    e.preventDefault();

    var jprms, 
        handler,
        pass = document.getElementById('adminpass').value,
        confpass = document.getElementById('confirmpass').value,
        select = document.getElementById('interfacelang'),
        lang = select.options[select.selectedIndex].value,
        name = document.getElementById('branchname').value;

    if (pass && pass != confpass) {
        alert('Please confirm your password.');
        return false;
    }
    else{
        show_loading_panel();
    }

    jprms = '"lang":"' + lang + '",';
    jprms += '"name":"' + name + '",';
    jprms += '"branchid":"' + document.getElementById('branchid').value + '",';
    jprms += '"oid":"' + PbxObject.oidOptions + '",';
    if (pass)
        jprms += '"adminpass":"' + pass + '",';

    if (document.getElementById('limconn').checked) {
        jprms += '"maxlines":"' + document.getElementById('maxlines').value + '",';
    }
    else {
        var maxint = parseInt('0x7fffffff', 16);
        jprms += '"maxlines":"' + maxint + '",';
    }

    jprms += '\"options\":{';
    var file = document.getElementById("musonhold");
    if (file.value) {
        jprms += '"holdmusicfile":"' + file.files[0].name + '",';
        upload('musonhold');
    }
    if (document.getElementById('holdreminterv').value)
        jprms += '"holdremindtime":' + document.getElementById('holdreminterv').value + ',';
    if (document.getElementById('holdrectime').value)
        jprms += '"holdrecalltime":' + document.getElementById('holdrectime').value + ',';
    if (document.getElementById('transrectime').value)
        jprms += '"transferrecalltime":' + document.getElementById('transrectime').value + ',';
    if (document.getElementById('transrecdest').value)
        jprms += '"transferrecallnumber":"' + document.getElementById('transrecdest').value + '",';
    jprms += '"autoretrive":' + document.getElementById('autoretrieve').checked + ',';
    if (document.getElementById('parkrectime').value)
        jprms += '"parkrecalltime":' + document.getElementById('parkrectime').value + ',';
    if (document.getElementById('parkrecdest').value)
        jprms += '"parkrecallnumber":"' + document.getElementById('parkrecdest').value + '",';
    if (document.getElementById('discontime').value)
        jprms += '"parkdroptimeout":' + document.getElementById('discontime').value + ',';
    jprms += '},';

    jprms += '\"localtrunk\":{';
    jprms += '"inboundanumbertransforms":[';
    jprms += encode_transforms('transforms5');
    jprms += '],';
    jprms += '"inboundbnumbertransforms":[';
    jprms += encode_transforms('transforms6');
    jprms += '],';
    jprms += '"outboundanumbertransforms":[';
    jprms += encode_transforms('transforms7');
    jprms += '],';
    jprms += '"outboundbnumbertransforms":[';
    jprms += encode_transforms('transforms8');
    jprms += ']';
    jprms += '}';

    if (lang !== PbxObject.lang) {
        PbxObject.lang = lang;
        window.sessionStorage.setItem('pbxLanguage', lang);
        handler = set_options_success;
    }
    else {
        handler = set_object_success;
    }

    json_rpc_async('setPbxOptions', jprms, handler);
}

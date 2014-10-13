
window.onerror = function(msg, url, linenumber) {
 console.error('Error message: '+msg+'\nURL: '+url+'\nLine number: '+linenumber);
};

var ProjectML = ProjectML || {};


// $(document).ready(function(){    

//     createWebsocket();
//     init_page();
//     setPageHeight();
//     getTranslations();

// });

function createWebsocket(){

    var protocol = (location.protocol === 'http:') ? 'ws:' : 'wss:';
    ProjectML.websocket = new WebSocket(protocol + '//'+window.location.host+'/','json.api.smile-soft.com'); //Init Websocket handshake
    ProjectML.websocket.onopen = function(e){
        console.log('WebSocket opened');
        ProjectML.websocketTry = 1;

    };
    ProjectML.websocket.onmessage = function(e){
        console.log(e);
        handleMessage(e.data);
    };
    ProjectML.websocket.onclose = function(){
        console.log('WebSocket closed');
        var time = generateInterval(ProjectML.websocketTry);
        setTimeout(function(){
            ProjectML.websocketTry++
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
        notify_about('info' , ProjectML.frases.timeout[ProjectML.language]);
        show_content();
    }, 30000);
    xhr.onreadystatechange = function() {
        if (xhr.readyState==4){
            clearTimeout(requestTimer);
            if(xhr.status != 200) {
                notify_about('error', ProjectML.frases.error[ProjectML.language]);
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

    ProjectML.websocket.send(data);

}

function loadTranslations(result){
    ProjectML.frases = result;
}

function setPageHeight(){
    $('#pagecontent').css('min-height', function(){
        return $(window).height();
    });
}

function changeOnResize(isSmall){
    if(ProjectML.smallScreen !== isSmall){
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
        ProjectML.smallScreen = isSmall;
    }
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
        ProjectML.CallsBoard.setCurrentCalls(result);
    }
    else if(id == 6){
        ProjectML.CallsBoard.setCurrentState(result);
    }

}

function init(result){

    ProjectML.language = result.lang || 'uk';

    if (document.readyState === "complete" || document.readyState === "interactive") {
        init_page(result);
    } else {
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', function factorial() {
                document.removeEventListener('DOMContentLoaded', arguments.callee, false);
                init_page(result);
            }, false);
        } else if (document.attachEvent) {
            document.attachEvent('onreadystatechange', function() {
                if (document.readyState === 'complete') {
                    document.detachEvent('onreadystatechange', arguments.callee);
                    init_page(result);
                }
            });
        }
    }
}

function init_page(data){

    setPageHeight();
    // ProjectML.language = window.sessionStorage.getItem('pbxLanguage');
    ProjectML.groups = {};
    // ProjectML.language = 'uk';
    ProjectML.smallScreen = isSmallScreen();
    FastClick.attach(document.body);

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
        location.hash = 'extensions';
    
    get_object();
    setTimeout(function(){set_listeners();}, 1000);

}

function set_listeners(){

    $(window).on('hashchange', get_object);
    $('.sidebar-toggle', '#pagecontent').click(toggle_sidebar);
    $('.options-open', '#pagecontent').click(open_options);
    $('.options-close', '#pbxoptions').click(close_options);
    $('#pbxmenu li a[data-kind]').click(showGroups);

}

function showGroups(e){
    e.preventDefault();
    var targ = this;
    var kind = targ.getAttribute('data-kind');
    var parent = targ.parentNode;
    var groupslist = parent.querySelector('ul');

    console.log(kind);
    if(!groupslist){
        var ul, li, a;
        var result = json_rpc('getObjects', '\"kind\":\"'+kind+'\"');
        ProjectML.groups[kind] = ProjectML.groups[kind] || [];
        ProjectML.groups[kind].push(result);

        ul = document.createElement('ul');
        li = document.createElement('li');
        a = document.createElement('a');

        if(kind != 'routes') {
            ul.id = 'ul-'+kind;
            li.className = 'add-group-object';
            a.href = '#'+kind;
            a.innerHTML ='<i class="glyphicon glyphicon-plus"></i><span>'+ProjectML.frases.add[ProjectML.language]+'</span>';

            li.appendChild(a);
            ul.appendChild(li);    
        }

        result.forEach(function(item, i){
            li = document.createElement('li');
            li.innerHTML = '<a href="#'+kind+'?'+item.oid+'">'+item.name+'</a>';
            ul.appendChild(li);
        });

        parent.appendChild(ul);
        parent.classList.toggle('active');
    } else {
        parent.classList.toggle('active');
    }
}

function get_object(result){

    var query = location.hash.substring(1),
        obj = query.indexOf('?') != -1 ? query.substring(0, query.indexOf('?')) : query.substring(0),
        oid = query.indexOf('?') != -1 ? query.substring(query.indexOf('?')+1) : obj, //if no oid in query then set kind as oid
        lang = ProjectML.language,
        callback = null,
        fn = null;
        
    if(query === ProjectML.query) return;    
    if(query != ''){

        ProjectML.query = query;
        ProjectML.obj = obj;
        ProjectML.oid = oid;

        $('#dcontainer').addClass('faded');

        // show_loading_panel();

        var modal = document.getElementById('el-extension');
        if(modal) modal.parentNode.removeChild(modal);

        if(obj == 'users' || obj == 'channel' || obj == 'hunting' || obj == 'conference' || obj == 'selector'){
            obj = 'bgroup';
        }

        callback = 'load_' + obj;
        fn = window[callback];
//        var url = '/badmin/js/'+query+'.js';
//        $.getScript(url, function(){

            $("#dcontainer").load('badmin/'+lang+'/'+obj+'.html', function(){
                if(obj == 'extensions'){
                    // if(ProjectML.extensions)
                    //     load_extensions(ProjectML.extensions);
                    // else
                        json_rpc_async('getExtensions', null, fn);
                }
                // else if(obj == 'calls' || obj == 'records'){
                //     fn();
                // }
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
    var kind = ProjectML.kind;
    if(kind != 'extensions' && kind != 'trunk' && kind != 'routes'){
            kind = 'bgroup';
        }
    var trow = document.querySelectorAll('.transrow'),
        rtrow = document.querySelectorAll('.routerow'),
        so = document.getElementById('el-set-object'),
        delobj = document.getElementById('el-delete-object'),
        handler = 'set_'+kind,
        fn = window[handler];

    if(trow.length){
        for(i=0;i<trow.length;i++){
            addEvent(trow[i], 'click', append_transform);
        }
    }
    if(rtrow.length){
        for(i=0;i<rtrow.length;i++){
            addEvent(rtrow[i], 'click', add_route);
        }
    }
    if(so){
        so.onclick = function(){
            fn();
        };
    }
    if(delobj){
        if(ProjectML.name){
            delobj.onclick = function(e){
                delete_object(e, ProjectML.name, ProjectML.kind, ProjectML.oid);
            };
        }
        else delobj.setAttribute('disabled', 'disabled');
    }

    $('div.panel-header').click(toggle_panel);

}

function toggle_sidebar(e){    

    if(e) e.preventDefault();

    $('#pagecontent').toggleClass('squeezed-right');
    $('#pbxmenu').toggleClass('squeezed-right');
    if(!isSmallScreen())
        toggle_menu();
    
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

function switch_presentation(kind){
    var container = document.getElementById('dcontainer');
    var extensions = document.getElementById('extensions');
    var transforms = document.getElementById('number-transforms');
    var panels = [].slice.call(container.querySelectorAll('.pl-kind'));
    var action;
    panels.forEach(function(item){
        action = item.classList.contains('pl-'+kind) ? 'add' : 'remove';
        item.classList[action]('revealed');
    });
}

// function switch_tab(tabid){
//     var div = document.getElementById(tabid);
//     var parent = div.parentNode.parentNode;
//     var childs = parent.children;
//     for(var i=0;i<childs.length;i++){
//         if(childs[i].children[0].id != tabid) {
//             childs[i].style.display = 'none';  
//         }
//         else childs[i].style.display = '';
//     }
// }

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

function addNewObject(data){

    var oid = data.oid,
        kind = data.kind,
        name = data.name,
        enabled = data.enabled,
        load = document.getElementById('el-loading'),
        ul = document.getElementById('ul-'+data.kind);

    if(load) load.parentNode.removeChild(load);
    
    if(ul){
        var li = document.createElement('li'),
            a = document.createElement('a');
        a.href = '#'+kind+'?'+oid;
        a.innerHTML = name;
        li.appendChild(a);
        ul.appendChild(li);
    }

    update = {
        enabled: enabled,
        name: name,
        oid: oid
    };

    ProjectML.query = kind+'?'+oid;
    ProjectML.groups[kind] = ProjectML.groups[kind] || [];
    ProjectML.groups[kind].push(update);

    notify_about('success', name+' '+ProjectML.frases.created[ProjectML.language]);

}

function set_object_success(){
    var load = document.getElementById('el-loading');
    if(load) load.parentNode.removeChild(load);

    notify_about('success', ProjectML.frases.saved[ProjectML.language]);
}

function set_options_success() {
    var i, newpath = '', parts = window.location.pathname.split('/');
    for (i = 0; i < parts.length; i++) {
        if (parts[i] === 'en' || parts[i] === 'uk' || parts[i] === 'ru') {
            parts[i] = ProjectML.language;
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
    var c = confirm(ProjectML.frases.doDelete[ProjectML.language]+' '+name+'?');
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
        if(oid === ProjectML.oid) window.location.hash = kind;

        ProjectML.groups[kind] = ProjectML.groups[kind].filter(function(obj){
            return obj.oid !== oid;
        });
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
        msg = ProjectML.frases.doDelete[ProjectML.language] + ' ' + ext + ' ' +ProjectML.frases.from[ProjectML.language] + ' ' + group + '?',
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
    uplbtn.className = 'btn btn-default btn-sm needsclick';
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
        notify_about('info', ProjectML.frases.timeout[ProjectML.language]);
    }, 30000);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4){
            clearTimeout(requestTimer);
            if(xmlhttp.status != 200) {
                notify_about('error', ProjectML.frases.error[ProjectML.language]);
            }
            else{
                if(upload == 'uploadapp') {
                    notify_about('success' , file.name+' '+ProjectML.frases.uploaded[ProjectML.language]);
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

    ProjectML.oidOptions = result.oid;

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
    jprms += '"oid":"' + ProjectML.oidOptions + '",';
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

    if (lang !== ProjectML.language) {
        ProjectML.language = lang;
        window.sessionStorage.setItem('pbxLanguage', lang);
        handler = set_options_success;
    }
    else {
        handler = set_object_success;
    }

    json_rpc_async('setPbxOptions', jprms, handler);
}

(function(){
    json_rpc_async('getPbxOptions', null, init);
    createWebsocket();
    getTranslations();
})();


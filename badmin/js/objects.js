
/* 
 * Setting ui for PBX group
 */

function load_bgroup(result){
    console.log(result);
    switch_presentation(result.kind);

    ProjectML.oid = result.oid;
    ProjectML.kind = result.kind;
    ProjectML.name = result.name;

    var select, option;
    var d = document;
    var kind = result.kind;
    var cont = d.getElementById('dcontainer');
    var greet = d.getElementById("playgreet");
    var options = d.getElementById('options');
    var enabled = document.getElementById('enabled');
    var formats = [ "OFF", "320x240", "352x288", "640x360", "640x480", "704x576", "1024x768", "1280x720", "1920x1080" ];

    if(result.name) {
        d.getElementById('objname').value = result.name;
    }
    if(enabled) enabled.checked = result.enabled;
    
    if(result.available) fill_list_items('available', result.available);
    if(result.members) fill_list_items('members', result.members);

    if(kind == 'users') {
        var table = d.getElementById('extensions').querySelector('tbody');
        /***TODO***/
    }
    if(result.options){
        if(kind == 'hunting'){
            if(result.options.timeout) d.getElementById("timeout2").value = result.options.timeout;
            if(result.options.huntmode) d.getElementById("huntmode2").selectedIndex = result.options.huntmode;
        }
        else if(kind == 'conference' || kind == 'channel' || kind == 'selector'){
            ProjectML.videomax = result.maxvideomode;

            customize_upload('onhold2', null);
            customize_upload('greeting2', null);
            
            var numbers = result.numbers;
            if(numbers) {
                numbers = numbers.sort();
                select = d.getElementById("in-number");
                numbers.forEach(function(item, index){
                    option = '<option value"'+item+'">'+item+'</option>';
                    select.innerHTML += option;
                });
            }

            if(kind == 'channel') {
                var types = [].slice.call(cont.querySelectorAll('[name="objectType"]'));
                /***TODO***/
            }

            d.getElementById("dialuptt").value = result.options.dialtimeout || '';
            d.getElementById("autoredial").checked = result.options.autoredial;
        
            greet.checked = result.options.greeting;
            if(greet.checked) greet.checked = result.options.greetingfile ? true : false;
                
            var modes = [].slice.call(cont.querySelectorAll('.init-mode'));
            modes.forEach(function(item){
                if(result.options.initmode == item.value){
                    item.checked = true;
                }
            });

            select = d.getElementById("videoform");
            for(var i=0;i<formats.length;i++){
                option = d.createElement('option');
                option.value = formats[i];
                option.innerHTML = formats[i];
                select.appendChild(option);
                if(formats[i] == result.options.videomode) {
                    select.selectedIndex = i;
                }
                if(formats[i] == result.options.maxvideomode) {
                    break;
                }
            }
        }
    }
    if(result.profile){
        d.getElementById('hold').checked = result.profile.hold;
        d.getElementById('busyover').checked = result.profile.busyover;
        d.getElementById('monitor').checked = result.profile.monitor;
        d.getElementById('busyoverdeny').checked = result.profile.busyoverdeny;
        d.getElementById('monitordeny').checked = result.profile.monitordeny;
        d.getElementById('callwaiting').checked = result.profile.callwaiting;

        var transforms = result.profile.bnumbertransforms;
        if(transforms.length != 0){
            for(var i=0; i<transforms.length; i++){
                append_transform(null, 'transforms', transforms[i]);
            }
        }
        else {
            append_transform(null, 'transforms');
        }

    }

    show_content(); 
    set_page();
}

function set_bgroup(){

    var jprms,
        d = document,
        name = d.getElementById('objname').value;

    if(name)
        jprms = '"name":"'+name+'",';
    else{
        alert(ProjectML.frases.missedNameField[ProjectML.language]);
        return false;
    }
    
    show_loading_panel();
    
    var handler;
    if(ProjectML.name) {
        handler = set_object_success;
    }
    else{
        ProjectML.name = name;
        handler = null;
    }

    var oid = ProjectML.oid;
    if(oid) jprms += '"oid":"'+oid+'",';
    
    var kind = ProjectML.kind;
    if(kind) jprms += '"kind":"'+kind+'",';
    jprms += '\"enabled\":'+document.getElementById('enabled').checked+',';
    var members = d.getElementById('members');
    if(members){
        jprms += '"members":[';
        for(var i=0; i<members.children.length; i++){
            jprms += '"'+members.children[i].innerHTML+'",';
        }
        jprms += '],';
    }
    var profile = d.getElementById('profile');
    if(profile){
        jprms += '"profile":{';
        if(d.getElementById("hold") != null){
            jprms += '"hold":'+d.getElementById("hold").checked+",";
        }
        if(d.getElementById("busyover") != null){
            jprms += '"busyover":'+d.getElementById("busyover").checked+",";
        }
        if(d.getElementById("monitor") != null){
            jprms += '"monitor":'+d.getElementById("monitor").checked+",";
        }
        if(d.getElementById("callwaiting") != null){
            jprms += '"callwaiting":'+d.getElementById("callwaiting").checked+",";
        }
        if(d.getElementById("monitordeny") != null){
            jprms += '"monitordeny":'+d.getElementById("monitordeny").checked+",";
        }
        if(d.getElementById("busyoverdeny") != null){
            jprms += '"busyoverdeny":'+d.getElementById("busyoverdeny").checked+",";
        }

        var table = d.getElementById('transforms').getElementsByTagName('tbody')[0];
        if(table){          
            jprms += '"bnumbertransforms":[';
            jprms += encode_transforms('transforms');
            jprms += ']';
        }
        jprms += '},';
    }
    jprms += '"options":{';
    
    if(kind == 'hunting'){
        jprms += '"timeout":'+d.getElementById("timeout2").value+',';
        jprms += '"huntmode":'+d.getElementById("huntmode2").value+',';
        jprms += '"huntfwd":'+d.getElementById("huntfwd2").checked+',';
    }
    else if(kind == 'conference'){
        jprms += '"dialtimeout":'+d.getElementById("dialuptt").value+',';
        jprms += '"autoredial":'+d.getElementById("autoredial").checked+',';
        jprms += '"recording":'+d.getElementById("confrecord").checked+',';
        jprms += '"videomode":"'+d.getElementById("videoform").value+'",';
        var greet = d.getElementById("playgreet");
        jprms += '"greeting\":'+greet.checked+',';
        file = document.getElementById("greeting2");
        if(greet.checked && file.value){
            jprms += '"greetingfile":"'+file.files[0].name+'",';
            upload('greeting2');
        }
        var modes = d.getElementById("conf-init-mode").getElementsByClassName('init-mode');
        for(i=0;i<modes.length;i++){
            if(modes[i].checked) {
                jprms += '"initmode":'+modes[i].value+',';
                if(modes[i].value == 2) {
                    file = document.getElementById("onhold2");
                    if(file.value){
                        jprms += '"onholdfile":"'+file.files[0].name+'",';
                        upload('onhold2');
                    }
                }
            }
        }
    }
    jprms += '}';
    json_rpc_async('setObject', jprms, handler); 
}

function fill_list_items(listid, items){
    if(listid == 'available' || (ProjectML.kind != 'hunting')) {
        items.sort();
    }
    var list = document.getElementById(listid);
    for(var i=0; i<items.length; i++){
        var item = document.createElement('li');
        addEvent(item, 'click', move_list_item);
        item.setAttribute('data-value', items[i]);
        item.innerHTML = items[i];
        list.appendChild(item);
    }
}

function move_list_item(){
    var li = this;
    var parent = li.parentNode;
    if(parent.id == 'available'){
        parent.removeChild(li);
        document.getElementById('members').appendChild(li);
    }
    else{
        parent.removeChild(li);
        document.getElementById('available').appendChild(li);
    }
}

/* 
 * UI for PBX extensions
 */

function getInfoFromState(state, group){

    if(state == 0) {
        status = 'Idle';
        className = 'success';
    } else if(state == 3) {
        status = 'Talking';
        className = 'connected';
    } else if(state == 6) {
        status = 'Forwarding';
        className = 'warning';
    } else if(state == 5 || (state == -1 && group)) {
        status = '';
        className = '';
    } else if(state == 4) {
        status = 'DND';
        className = 'danger';
    } else if(state == 1 || state == 2) {
        status = state == 1 ? 'Dialing' : 'Ringing';
        className = 'info';
    } else {
        status = '';
        className = 'active';
    }

    return {
        rstatus: status,
        rclass: className
    }

}

function createExtRow(data){

    var row = document.createElement('tr'),
        cell, a, newkind;

    cell = row.insertCell(0);
    if(data.oid){
        a = document.createElement('a');
        if(data.kind == 'user' || data.kind == 'phone') {
            a.href = '#';
            addEvent(a, 'click', get_extension);
        } else {
            a.href = '#' + data.kind + '?' + data.oid;
        }
        a.textContent = data.ext;
        cell.appendChild(a);
    } else {
        cell.textContent = data.ext;
    }
    
    cell = row.insertCell(1);
    cell.textContent = data.name || "";

    cell = row.insertCell(2);
    cell.textContent = data.group || "";
    
    cell = row.insertCell(3);
    cell.textContent = data.reg || "";

    cell = row.insertCell(4);
    cell.textContent = data.kind || "";

    cell = row.insertCell(5);
    cell.textContent = data.status || "";

    cell = row.insertCell(6);
    if(data.kind == 'user' || data.kind == 'phone') {
        button = document.createElement('button');
        button.className = 'btn btn-primary btn-sm';
        button.innerHTML = '<i class="glyphicon glyphicon-edit"></i>';
        addEvent(button, 'click', editExtension);
        cell.appendChild(button);
    }    
    cell = row.insertCell(7);
    if(data.oid) {
        button = document.createElement('button');
        button.className = 'btn btn-danger btn-sm';
        button.innerHTML = '<i class="glyphicon glyphicon-trash"></i>';
        addEvent(button, 'click', delete_extension);
        cell.appendChild(button);
    }

    return row;

}

function load_extensions(result) {
    console.log(result);
    var row, obj, state, info,
        table = document.getElementById('extensions').getElementsByTagName('tbody')[0],
        fragment = document.createDocumentFragment();

    ProjectML.extensions = result;

    for(var i=0; i<result.length; i++){

        obj = result[i];
        state = obj.state;
        info = getInfoFromState(state, obj.group);

        data = {
            oid: obj.oid,
            ext: obj.ext,
            kind: obj.kind,
            group: obj.group,
            status: info.rstatus,
            name: obj.name,
            reg: obj.reg
        };

        // lrow = table.rows.length;
        // row = table.insertRow(lrow);
        row = createExtRow(data);
        row.id = obj.ext;
        row.setAttribute('data-oid', obj.oid);
        row.className = info.rclass;

        fragment.appendChild(row);

    }
        
    table.appendChild(fragment);
    var inputs = document.getElementsByClassName('el-search');
    if(inputs.length){
        for(i=0;i<inputs.length;i++){
            inputs[i].oninput = function(){
                filter_table();
            };
        }
    }
    
    var $modal = $('#el-extension');
    $($modal).insertBefore('#pagecontainer');
    
    show_content();

}

function updateExtension(data){

    console.log(data);

    var row = document.getElementById(data.ext);
    if(!row) return;
    
    var state = data.state,
        cells = row.cells,
        info = getInfoFromState(state, data.group),
        status = info.rstatus,
        className = info.rclass;
    
    row.className = className;

    if(data.name){
        cells[1].innerHTML = data.name;
    }
    if(data.hasOwnProperty('group')){
        cells[2].innerHTML = data.group;
    }
    // else{
    //     cells[2].innerHTML = "";   
    // }
    if(data.hasOwnProperty('reg')){
        cells[3].innerHTML = data.reg;
    }
    // else{
    //     cells[3].innerHTML = "";
    // }
    cells[5].innerHTML = status;

    for(var ext in ProjectML.extensions){

        if(ProjectML.extensions[ext].oid === data.oid || ProjectML.extensions[ext].ext === data.ext){
            var ext = ProjectML.extensions[ext];
            if(ext.state) ext.state = data.state;
            if(ext.name) ext.name = data.name;
            if(ext.group) ext.group = data.group;
            if(ext.reg) ext.reg = data.reg;
        }

    }

}

function get_extension(e){
    var e = e || window.event;
    if(e.type == 'click')
        e.preventDefault();

    var oid = getClosest(e.target, 'tr').getAttribute('data-oid');
    
    if(oid){
        show_loading_panel();
        json_rpc_async('getObject', '\"oid\":\"'+oid+'\"', load_extension);
    }
    
}

function editExtension(e){

    var row = getClosest(e.target, 'tr'),
        table = row.parentNode,
        tr = document.createElement('tr'),
        // tr = row.cloneNode(false),
        cells = row.cells,
        name = cells[1].textContent,
        group = cells[2].textContent,
        reg = cells[3].textContent,
        kind = cells[4].textContent,
        status = cells[5].textContent,
        cell, div, inp, sel, button;

    tr.setAttribute('data-ext', row.id);
    cell = tr.insertCell(0);
    cell.innerHTML = cells[0].innerHTML;

    cell = tr.insertCell(1);
    cell.innerHTML = '<input class="form-control extname" value="'+name+'">';
    // div = document.createElement('div');
    // div.innerHTML = '<input class="form-control" value="'+name+'">';
    // div.className = 'form-group';

    // inp = document.createElement('input');
    // inp.className = 'form-control';
    // inp.value = name;
    // cell.appendChild(inp);

    cell = tr.insertCell(2);
    if(kind == 'user' || kind == 'phone'){
        var newkind = kind == 'user' ? 'users':'unit';
        // div = document.createElement('div');
        // div.className = 'form-group';
        sel = document.createElement('select');
        sel.className = 'form-control extgroup';
        fill_group_choice(newkind, group, sel);
        // div.appendChild(sel);
        cell.appendChild(sel);
    } else {
        cell.textContent = group;
    }

    cell = tr.insertCell(3);
    // div = document.createElement('div');
    // div.className = 'form-group';
    if(kind == 'phone' || reg.indexOf('.') != -1) {
        cell.textContent = reg;
    } else {
        cell.innerHTML = '<input class="form-control extreg" value="'+reg+'">';
    }

    // cell.appendChild(div);
    // inp = document.createElement('input');
    // inp.className = 'form-control';
    // inp.setAttribute('type', 'text');
    // inp.value = reg;
    // if(reg.indexOf('.') != -1){
    //     inp.setAttribute('disabled', '');    
    // }
    // div.appendChild(inp);

    cell = tr.insertCell(4);
    cell.textContent = kind;
    cell = tr.insertCell(5);
    cell.textContent = status;

    cell = tr.insertCell(6);
    button = document.createElement('button');
    button.className = 'btn btn-default btn-sm';
    button.innerHTML = '<i class="glyphicon glyphicon-chevron-left"></i>';
    addEvent(button, 'click', function(){
        row.style.display = 'table-row';
        table.removeChild(tr);
    });
    cell.appendChild(button);

    cell = tr.insertCell(7);
    button = document.createElement('button');
    button.className = 'btn btn-success btn-sm';
    button.innerHTML = '<i class="glyphicon glyphicon-ok"></i>';
    addEvent(button, 'click', set_extension_update);
    cell.appendChild(button);

    table.insertBefore(tr, row);
    row.style.display = 'none';
    // table.removeChild(row);

}

function set_extension_update(e){

    var row = getClosest(e.target, 'tr'),
        ext = row.getAttribute('data-ext'),
        trow = document.getElementById(ext),
        toid = trow.getAttribute('data-oid'),
        name = row.querySelector('.extname').value,
        groups = row.querySelector('.extgroup'),
        groupid = groups.options[groups.selectedIndex].value,
        reg = row.querySelector('.extreg');

    var fwd, dnd, jprms = '\"oid\":\"'+toid+'\",';
    jprms += '\"name\":\"'+name+'\",';
    jprms += '\"groupid\":\"'+groupid+'\",';
    if(reg) jprms += '\"followme\":\"'+reg.value+'\",';
    json_rpc('setObject', jprms); 

    console.log(jprms);

    row.parentNode.removeChild(row);
    trow.style.display = 'table-row';

}

function load_extension(result){
    console.log(result);

    var d = document,
        groupid = result.groupid,
        kind = result.kind == 'user' ? 'users':'unit';
    ProjectML.kind = kind;
    ProjectML.oid = result.oid;
    
    
    document.getElementById('el-extension-num').innerHTML = 'Extension '+result.number;
    
    var select = document.getElementById("extgroup");
    for(var i=0;i<=select.options.length;i++){
        select.remove(select.selectedIndex[i]);
    }
    
    if(groupid){
        select.disabled = false;
        fill_group_choice(kind, groupid);
    }
    else {
        select.disabled = true;
    }
    if(kind == 'users'){
        d.getElementById('followme').disabled = false;
        d.getElementById('followme').value = result.followme;
        d.getElementById('extpassword').type = 'password';
    }
    else{
        d.getElementById('followme').disabled = true;
        d.getElementById('followme').value = '';
        d.getElementById('extpassword').type = 'text';
    }
    d.getElementById('extname').value = result.name;
    d.getElementById('extpin').value = result.pin;
    d.getElementById('extlogin').value = result.login;
    d.getElementById('extpassword').value = result.password;
    d.getElementById('extdisplay').value = result.display;
    if(result.features){
        d.getElementById('extfeatures').style.display = '';
        if(result.features.fwdall != undefined){
            d.getElementById('forwarding').style.display = '';
            d.getElementById('fwdall').checked = result.features.fwdall;
            d.getElementById('fwdallnumber').value = result.features.fwdallnumber;
            d.getElementById('fwdnreg').checked = result.features.fwdnreg;
            d.getElementById('fwdnregnumber').value = result.features.fwdnregnumber;
            d.getElementById('fwdbusy').checked = result.features.fwdbusy;
            d.getElementById('fwdbusynumber').value = result.features.fwdbusynumber;
            d.getElementById('fwdnans').checked = result.features.fwdnans;
            d.getElementById('fwdnansnumber').value = result.features.fwdnansnumber;
            d.getElementById('fwdtimeout').value = result.features.fwdtimeout;
        }
        else{
            d.getElementById('forwarding').style.display = 'none';
        }
        
        if(result.features.dnd != undefined){
            d.getElementById('dnd').checked = result.features.dnd;
        }
        else{
            d.getElementById('dnd').setAttribute('disabled','');
            d.getElementById('dnd').checked = false;
        }
        if(result.features.clir != undefined){
            d.getElementById('clir').checked = result.features.clir; 
        }
        else{
            d.getElementById('clir').setAttribute('disabled','');
            d.getElementById('clir').checked = false; 
        }
        if(result.features.callwaiting != undefined){
            d.getElementById('callwaiting').checked = result.features.callwaiting;
        }
        else{
            d.getElementById('callwaiting').setAttribute('disabled','');
            d.getElementById('callwaiting').checked = false;
        }
        if(result.features.pickupdeny != undefined){
            d.getElementById('pickupdeny').checked = result.features.pickupdeny;
        }
        else{
            d.getElementById('pickupdeny').setAttribute('disabled','');
            d.getElementById('pickupdeny').checked = false;
        }
        if(result.features.monitordeny != undefined){
            d.getElementById('monitordeny').checked = result.features.monitordeny;
        }
        else{
            d.getElementById('monitordeny').setAttribute('disabled','');
            d.getElementById('monitordeny').checked = false;
        }
        if(result.features.busyoverdeny != undefined){
            d.getElementById('busyoverdeny').checked = result.features.busyoverdeny;
        }
        else{
            d.getElementById('busyoverdeny').setAttribute('disabled','');
            d.getElementById('busyoverdeny').checked = false;
        }
        if(result.features.voicemail != undefined){
            d.getElementById('voicemail').checked = result.features.voicemail;
        }
        else{
            d.getElementById('voicemail').setAttribute('disabled','');
            d.getElementById('voicemail').checked = false;
        }
        if(result.features.recording != undefined){
            d.getElementById('recording').checked = result.features.recording;
        }
        else{
            d.getElementById('recording').setAttribute('disabled','');
            d.getElementById('recording').checked = false;
        }
        if(result.features.lock != undefined){
            d.getElementById('plock').checked = result.features.lock;
        }
        else{
            d.getElementById('plock').setAttribute('disabled','');
            d.getElementById('plock').checked = false;
        }
    }
    else {
        d.getElementById('extfeatures').style.display = 'none';
    }
    
    $('#el-extension').modal();
    show_content();
    
    d.getElementById('el-set-object').onclick = function(){
        set_extension();
    };
//    addEvent(so, 'click', function(oid){
//        return function(event){set_extension(event, oid)};
//    }(result.oid));
}

function set_extension(e){
    var e = e || window.event;
    if(e.type == 'click')
        e.preventDefault();
    var d = document,
        oid = ProjectML.oid,
        kind = ProjectML.kind;
    
    var jprms = '\"oid\":\"'+oid+'\",';
    var group = d.getElementById("extgroup");
    if(group.options.length) var groupv = group.options[group.selectedIndex].value;
    
    if(groupv)
        jprms += '\"groupid\":\"'+groupv+'\",';
    if(kind == 'users'){
        jprms += '\"followme\":\"'+d.getElementById("followme").value+'\",';
    }
    jprms += '\"name\":\"'+d.getElementById("extname").value+'\",';
    jprms += '\"display\":\"'+d.getElementById("extdisplay").value+'\",';
    jprms += '\"login\":\"'+d.getElementById("extlogin").value+'\",';
    jprms += '\"password\":\"'+d.getElementById("extpassword").value+'\",';
    jprms += '\"pin\":\"'+d.getElementById("extpin").value+'\",';
    jprms += '\"features\":{';
    if(d.getElementById("fwdall") != null){
        jprms += '\"fwdall\":'+d.getElementById("fwdall").checked+',';
        jprms += '\"fwdallnumber\":\"'+d.getElementById("fwdallnumber").value+'\",';
    }
    if(d.getElementById("fwdnregnumber") != null){   
        jprms += '\"fwdnreg\":'+d.getElementById("fwdnreg").checked+',';
        jprms += '\"fwdnregnumber\":\"'+d.getElementById("fwdnregnumber").value+'\",';
    }
    if(d.getElementById("fwdbusynumber") != null){
        jprms += '\"fwdbusy\":'+d.getElementById("fwdbusy").checked+',';
        jprms += '\"fwdbusynumber\":\"'+d.getElementById("fwdbusynumber").value+'\",';
    }
    if(d.getElementById("fwdnansnumber") != null){
        jprms += '\"fwdnans\":'+d.getElementById("fwdnans").checked+',';
        jprms += '\"fwdnansnumber\":\"'+d.getElementById("fwdnansnumber").value+'\",';
    }  
    if(d.getElementById("fwdtimeout") != null)    
        jprms += '\"fwdtimeout\":'+d.getElementById("fwdtimeout").value+',';
    if(d.getElementById("plock").disabled == false)    
        jprms += '\"lock\":'+d.getElementById("plock").checked+',';
    if(d.getElementById("dnd").disabled == false)    
        jprms += '\"dnd\":'+d.getElementById("dnd").checked+',';
    if(d.getElementById("clir").disabled == false)    
        jprms += '\"clir\":'+d.getElementById("clir").checked+',';
    if(d.getElementById("callwaiting").disabled == false)
        jprms += '\"callwaiting\":'+d.getElementById("callwaiting").checked+',';
    if(d.getElementById("pickupdeny").disabled == false)    
        jprms += '\"pickupdeny\":'+d.getElementById("pickupdeny").checked+',';
    if(d.getElementById("monitordeny").disabled == false)    
        jprms += '\"monitordeny\":'+d.getElementById("monitordeny").checked+',';
    if(d.getElementById("busyoverdeny").disabled == false)    
        jprms += '\"busyoverdeny\":'+d.getElementById("busyoverdeny").checked+',';
    if(d.getElementById("recording").disabled == false)    
        jprms += '\"recording\":'+d.getElementById("recording").checked+',';
    if(d.getElementById("voicemail").disabled == false)    
        jprms += '\"voicemail\":'+d.getElementById("voicemail").checked+',';
    jprms += '}';  

    json_rpc('setObject', jprms); 
    
    $('#el-extension').modal('hide');
    
    // update_extansions();
}

function fill_group_choice(kind, groupid, select){ 
    var result = json_rpc('getObjects', '\"kind\":\"'+kind+'\"');
    var gid, name, option, i;
    var select = select || document.getElementById("extgroup");

    for(i=0; i<result.length; i++){
        gid = result[i].oid;
        name = result[i].name;
        option = document.createElement('option');
        option.setAttribute('value', gid);
        if(gid == groupid || name == groupid) {
            option.selected = "true";
        }
        option.innerHTML = result[i].name;
        select.appendChild(option);
    }
}

/* 
 * UI for PBX routing tables
 */

function load_routes(result){
    console.log(result);
    
    ProjectML.oid = result.oid;
    ProjectML.kind = 'routes';
    ProjectML.routepriorities = [
        "Max. prefix length",
        "Least cost routing",
        "Load balancing",
        "Answer seizure ratio",
        "Average call duration",
        "Most idle gateway",
        "Least utilised gateway",
        "Max. priority (status)"    
    ];
    ProjectML.name = result.name;
    if(result.name) {
        document.getElementById('objname').value = result.name;
    }
    
    document.getElementById('enabled').checked = result.enabled;
    
    var i, 
        ul = document.getElementById('priorities'),
        priorities = result.priorities;
    for(i=0; i<priorities.length; i++){
        var li = document.createElement('li');
        li.setAttribute('data-value', priorities[i]);
        li.innerHTML = ProjectML.routepriorities[priorities[i]];
        ul.appendChild(li);
    }

    var transforms = result.anumbertransforms;
    if(transforms.length) {
        for(i=0; i<transforms.length; i++){
            append_transform(null, 'transforms1', transforms[i]);
        }
    }
    else { 
        append_transform(null, 'transforms1');
    }

    transforms = result.bnumbertransforms;
    if(transforms.length){
        for(i=0; i<transforms.length; i++){
            append_transform(null, 'transforms2', transforms[i]);
        }
    }
    else{
        append_transform(null, 'transforms2');
    }
    
    if(result.routes != undefined){
        build_routes_table(result.routes);
    }
    else{
        show_content();
    }
    set_page();
}

function set_routes(){
        
    var name = document.getElementById('objname').value;
    if(name)
        var jprms = '\"name\":\"'+name+'\",';
    else{
        alert('Object name must be filled');
        return false;
    }
    show_loading_panel();
    
    var handler;
    if(ProjectML.name) {
        handler = set_object_success;
    }
    else{
        ProjectML.name = name;
        // handler = set_new_object;
        handler = null;
    }
    
    if(ProjectML.oid) jprms += '\"oid\":\"'+ProjectML.oid+'\",';
    jprms += '\"kind\":\"routes\",';
    jprms += '\"enabled\":'+document.getElementById('enabled').checked+',';
 
    jprms += '\"priorities\":[';
    var ul = document.getElementById('priorities');
    var i, j;
    for(i=0; i<ul.children.length; i++){
        jprms += ul.children[i].getAttribute('data-value')+',';
    }
    
    jprms += '],';
    jprms += '\"anumbertransforms\":[';
    jprms += encode_transforms('transforms1');
    jprms += '],';
    jprms += '\"bnumbertransforms\":[';
    jprms += encode_transforms('transforms2');
    jprms += '],';
    
    jprms += '\"routes\":[';
    var str, name, row, els, inp, table = document.getElementById('rtable'); 
    for(i=1; i<table.rows.length; i++){
        row = table.rows[i];
        els = row.getElementsByClassName('form-group');
        str = '';
        for(j=0; j<els.length; j++){
            inp = els[j].firstChild;
            name = inp.getAttribute('name');
            if(name == 'number'){
                if(inp.value)
                    str += '"number":"'+inp.value+'",';
                else
                    break;
            }
            else if(name == 'description'){
                str += '"description":"'+inp.value+'",';
            }
            else if(name == 'target'){
                str += '"target":{"oid":"'+inp.value+'"},';
            }
            else if(name == 'priority'){
                str += '"priority":'+inp.value+',';
            }
            else if(name == 'cost'){
                str += '"cost":'+inp.value+',';
            }
        }
        if(str != '') jprms += '{'+str+'},';
    }
    jprms += ']';
    json_rpc_async('setObject', jprms, handler);     
}

function build_routes_table(routes){
    var result = json_rpc('getObjects', '\"kind\":\"all\"');
    console.log(result);
    var tbody = document.getElementById("rtable").getElementsByTagName('tbody')[0];
    for(var i=0; i<routes.length; i++){
        tbody.appendChild(build_route_row(routes[i], result));
    }
    tbody.appendChild(build_route_row(null, result));
    
    show_content();
}

function add_route(){
    var result = json_rpc('getObjects', '\"kind\":\"all\"');
    var tbody = document.getElementById("rtable").getElementsByTagName('tbody')[0];
    tbody.appendChild(build_route_row(null, result));
}

function build_route_row(route, objects){

    var e = e || window.event;
    if(e.type == 'click')
        e.preventDefault();

    var tr = document.createElement('tr');
    var td = document.createElement('td');
    var div = document.createElement('div');
    div.className = 'form-group';
    var cell = document.createElement('input');
    cell.className = 'form-control';
    cell.setAttribute('type', 'text');
    cell.setAttribute('name', 'number');
    cell.setAttribute('size', '12');
    if(route != null) {
        cell.setAttribute('value', route.number);
    }
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);

    td = document.createElement('td');
    var div = document.createElement('div');
    div.className = 'form-group';
    cell = document.createElement('input');
    cell.className = 'form-control';
    cell.setAttribute('type', 'text');
    cell.setAttribute('name', 'description');
    if(route != null) {
        cell.setAttribute('value', route.description);
    }
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);

    td = document.createElement('td');
    var div = document.createElement('div');
    div.className = 'form-group';
    cell = document.createElement('select');
    cell.setAttribute('name', 'target');
    for(i=0; i<objects.length; i++){
        var kind = objects[i].kind;
        if(kind == 'equipment' || kind == 'cli' || kind == 'timer' || kind == 'routes' || kind == 'users' || kind == 'pickup') {
            continue;
        }
        var oid = objects[i].oid;
        var option = document.createElement('option');
        option.setAttribute('value', oid);
        if(route != null && oid == route.target.oid){
            option.setAttribute('selected', '');
        }
        option.innerHTML = objects[i].name;
        cell.appendChild(option);
    }
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);
    
    td = document.createElement('td');
    var div = document.createElement('div');
    div.className = 'form-group';
    cell = document.createElement('select');
    cell.setAttribute('name', 'priority');
    for(i=0; i<10; i++){
        var option = document.createElement('option');
        option.setAttribute('value', i);
        if(route != null && i == route.priority){
            option.setAttribute('selected', '');
        }
        if(i == 0) {
            option.innerHTML = 'OFF';
        }
        else if(i == 9) {
            option.innerHTML = 'EXV';
        }
        else option.innerHTML = i;
        cell.appendChild(option);        
    }
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);
    
    td = document.createElement('td');
    var div = document.createElement('div');
    div.className = 'form-group';
    cell = document.createElement('input');
    cell.className = 'form-control';
    cell.setAttribute('type', 'text');
    cell.setAttribute('name', 'cost');
    cell.setAttribute('size', '4');
    cell.setAttribute('value', route != null ? route.cost : '0');
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);

    if(route != null && route.huntstop != undefined){
        td = document.createElement('td');
        cell = document.createElement('input');
        cell.setAttribute('type', 'checkbox');
        cell.setAttribute('name', 'huntstop');
        if(route.huntstop) cell.setAttribute('checked', route.huntstop);
        td.appendChild(cell);
        tr.appendChild(td);
    }
    
    td = document.createElement('td');
    cell = document.createElement('a');
    cell.href = "#";
    cell.className = 'remove-clr';
    cell.innerHTML = '<i class="glyphicon glyphicon-remove"></i>';
    addEvent(cell, 'click', remove_row);
    td.appendChild(cell);
    tr.appendChild(td);
        
    return tr;
}

/* 
 * UI for PBX trunks
 */

function load_trunk(result){
    ProjectML.oid = result.oid;
    ProjectML.name = result.name;
    ProjectML.kind = 'trunk';
    
    if(result.name)
        document.getElementById('objname').value = result.name;
    document.getElementById('enabled').checked = result.enabled;
    if(result.status)
        document.getElementById('status').innerHTML = result.status;
    if(result.protocol)
        document.getElementById('protocol').value = result.protocol;
    if(result.domain)
        document.getElementById('domain').value = result.domain;
    document.getElementById('register').checked = result.register;
    if(result.user)
        document.getElementById('user').value = result.user;
    if(result.auth)
        document.getElementById('auth').value = result.auth;
    if(result.pass)
        document.getElementById('pass').value = result.pass;
    document.getElementById('regexpires').value = result.regexpires || 60;
    
    var radio = document.getElementById('proxy');
    addEvent(radio, 'change', function(){
        var inputs = document.getElementsByName('proxy');
        // if(this.checked) var disabled = false;
        // else disabled = true;
        for(var i=0;i<inputs.length;i++){
            inputs[i].disabled = !this.checked;
        }
    });
    radio.checked = result.proxy;
    var inputs = document.getElementsByName('proxy');
    for(var i=0;i<inputs.length;i++){
        inputs[i].disabled = !result.proxy;
    }
    if(result.paddr)
        document.getElementById('paddr').value = result.paddr;
    if(result.pauth)
        document.getElementById('pauth').value = result.pauth;
    if(result.ppass)
        document.getElementById('ppass').value = result.ppass;
    if(result.maxinbounds != undefined){
        document.getElementById('maxinbounds').value = result.maxinbounds;
        document.getElementById('inmode').checked = result.maxinbounds > 0;
    }
    if(result.maxoutbounds != undefined){
        document.getElementById('maxoutbounds').value = result.maxoutbounds;
        document.getElementById('outmode').checked = result.maxoutbounds > 0;
    }
    if(result.parameters != undefined){
        var codecs = result.parameters.codecs;       
        if(codecs != undefined){
            var c;
            for(var i=0; i<codecs.length; i++){
                c = document.getElementById('c'+i);    
                if(!c) break;
                c.value = codecs[i].codec;
                document.getElementById('f'+i).value = codecs[i].frame;
            }
        }
        else{
            for(i=0; i<4; i++){
                document.getElementById('c'+i).selectedIndex = 0;
                document.getElementById('f'+i).value = 0;
            }
        }
        if(result.parameters.t1) document.getElementById('t1').value = result.parameters.t1 || 5;
        if(result.parameters.t2) document.getElementById('t2').value = result.parameters.t2 || 15;
        if(result.parameters.t3) document.getElementById('t3').value = result.parameters.t3 || 5;
        if(result.parameters.t38fax) document.getElementById('t38fax').checked = result.parameters.t38fax;
        if(result.parameters.video) document.getElementById('video').checked = result.parameters.video;
        if(result.parameters.dtmfrelay) document.getElementById('dtmfrelay').checked = result.parameters.dtmfrelay;
        if(result.parameters.earlymedia) document.getElementById('earlymedia').checked = result.parameters.earlymedia;
        if(result.protocol == 'h323'){
            document.getElementById('sip').parentNode.style.display = 'none';
            if(result.parameters.dtmfmode) document.getElementById('dtmfh323').value = result.parameters.dtmfmode;
            if(result.parameters.faststart) document.getElementById('faststart').checked = result.parameters.faststart;
            if(result.parameters.h245tunneling) document.getElementById('h245tunneling').checked = result.parameters.h245tunneling;
            if(result.parameters.playringback) document.getElementById('playringback').checked = result.parameters.playringback;
        }
        else{
            document.getElementById('h323').parentNode.style.display = 'none';  
            if(result.parameters.dtmfmode) document.getElementById('dtmfsip').value = result.parameters.dtmfmode;
        }
    }

    var transforms = result.inboundanumbertransforms;
    if(transforms.length) {
        for(i=0; i<transforms.length; i++){
            append_transform(null, 'transforms1', transforms[i]);
        }
    }
    else { 
        append_transform(null, 'transforms1');
    }

    transforms = result.inboundbnumbertransforms;
    if(transforms.length){
        for(i=0; i<transforms.length; i++){
            append_transform(null, 'transforms2', transforms[i]);
        }
    }
    else{
        append_transform(null, 'transforms2');
    }

    transforms = result.outboundanumbertransforms;
    if(transforms.length){
        for(i=0; i<transforms.length; i++){
            append_transform(null, 'transforms3', transforms[i]);
        }
    }
    else{
        append_transform(null, 'transforms3');
    }
    transforms = result.outboundbnumbertransforms;
    if(transforms.length){
        for(i=0; i<transforms.length; i++){
            append_transform(null, 'transforms4', transforms[i]);
        }
    }
    else{
        append_transform(null, 'transforms4');
    }
    
    var proto = document.getElementById('protocol');
    proto.onchange = change_protocol;

    show_content();
    set_page();
    
}

function set_trunk(){
    var name = document.getElementById('objname').value;
    var jprms;
    if(name)
        jprms = '"name":"'+name+'",';
    else{
        alert('Object name must be filled');
        return false;
    }
    
    show_loading_panel();

    var handler;
    if(ProjectML.oid) jprms += '"oid":"'+ProjectML.oid+'",';
    if(ProjectML.name) {
        handler = set_object_success;
    }
    else{
        ProjectML.name = name;
        // handler = set_new_object;
        handler = null;
    }
    
    jprms += '"kind":"trunk",';
    jprms += '"enabled":'+document.getElementById('enabled').checked+',';

    var protocol = document.getElementById('protocol').value;
    jprms += '"protocol":"'+protocol+'",';
    jprms += '"domain":"'+document.getElementById('domain').value+'",';
    jprms += '"register":'+document.getElementById('register').checked+',';
    jprms += '"user":"'+document.getElementById('user').value+'",';
    jprms += '"auth":"'+document.getElementById('auth').value+'",';
    jprms += '"pass":"'+document.getElementById('pass').value+'",';
    jprms += '"proxy":'+document.getElementById('proxy').checked+',';
    jprms += '"paddr":"'+document.getElementById('paddr').value+'",';
    jprms += '"pauth":"'+document.getElementById('pauth').value+'",';
    jprms += '"ppass":"'+document.getElementById('ppass').value+'",';

    if(document.getElementById('inmode').checked)
        jprms += '"maxinbounds":'+document.getElementById('maxinbounds').value+',';
    else
        jprms += '"maxinbounds":0,';
    if(document.getElementById('outmode').checked)
        jprms += '"maxoutbounds":'+document.getElementById('maxoutbounds').value+',';
    else
        jprms += '"maxoutbounds":0,';

    jprms += '"parameters":{';
    if(document.getElementById('codecs')){
        jprms += '"codecs":[';
        for(var i=0; i<4; i++){
            if(document.getElementById('c'+i).selectedIndex == 0) break;
            jprms += '{"codec":"'+document.getElementById('c'+i).value+'",';
            jprms += '"frame":'+document.getElementById('f'+i).value+'},';
        }
        jprms += '],';
    }
    if(document.getElementById('t1'))
        jprms += '"t1":'+document.getElementById('t1').value+',';
    if(document.getElementById('t2'))
        jprms += '"t2":'+document.getElementById('t2').value+',';
    if(document.getElementById('t3'))
        jprms += '"t3":'+document.getElementById('t3').value+',';
    if(document.getElementById('regexpires'))
        jprms += '"regexpires":'+document.getElementById('regexpires').value+',';
    if(document.getElementById('t38fax'))
        jprms += '"t38fax":'+document.getElementById('t38fax').checked+',';
    if(document.getElementById('video'))
        jprms += '"video":'+document.getElementById('video').checked+',';
    if(document.getElementById('earlymedia'))
        jprms += '"earlymedia":'+document.getElementById('earlymedia').checked+',';
    if(document.getElementById('dtmfrelay'))
        jprms += '"dtmfrelay":'+document.getElementById('dtmfrelay').checked+',';
    if(protocol == 'h323'){
        jprms += '"dtmfmode":"'+document.getElementById('dtmfh323').value+'",';
        jprms += '"faststart":'+document.getElementById('faststart').checked+',';
        jprms += '"h245tunneling":'+document.getElementById('h245tunneling').checked+',';
        jprms += '"playringback":'+document.getElementById('playringback').checked+',';
    }
    else{
        jprms += '"dtmfmode":"'+document.getElementById('dtmfsip').value+'",';
    }
    jprms += '},';
    jprms += '"inboundbnumbertransforms":[';
    jprms += encode_transforms('transforms1');
    jprms += '],';
    jprms += '"inboundanumbertransforms":[';
    jprms += encode_transforms('transforms2');
    jprms += '],';
    jprms += '"outboundbnumbertransforms":[';
    jprms += encode_transforms('transforms3');
    jprms += '],';
    jprms += '"outboundanumbertransforms":[';
    jprms += encode_transforms('transforms4');
    jprms += ']';

    json_rpc_async('setObject', jprms, handler); 
};

function change_protocol(){
    var value = this.value;
    if(value == 'h323') {
        document.getElementById('sip').parentNode.style.display = 'none';
        document.getElementById('h323').parentNode.style.display = '';
    }
    else {
        document.getElementById('sip').parentNode.style.display = '';
        document.getElementById('h323').parentNode.style.display = 'none';
    }
};
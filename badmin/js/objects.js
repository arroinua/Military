
window.onerror = function(msg, url, linenumber) {
     console.error('Error message: '+msg+'\nURL: '+url+'\nLine number: '+linenumber);
 };

/*
*
* Dashboard UI
*
*/

function CallsBoard(){
    var loaded = false,
        inc = document.querySelectorAll('.calls-incoming'),
        out = document.querySelectorAll('.calls-outgoing'),
        conn = document.querySelectorAll('.calls-connected'),
        load = document.querySelectorAll('.calls-load'),
        ttrunks = document.getElementById('calls-trunks').querySelector('tbody'),
        tcalls = document.getElementById('calls-table').querySelector('tbody'),
        lrow = ttrunks.rows.length,
        row, cell, a;


    this.init = function(){
        this.update = setInterval(this.checkStates.bind(this), 1000);
        addEvent(window, 'hashchange', this.stopUpdate.bind(this));
    };

    this.checkStates = function(){
        sendData('getCurrentCalls', null, 5);
        sendData('getCurrentState', null, 6);
        // json_rpc_async('getCurrentCalls', null, this.setCurrentCalls.bind(this));
        // json_rpc_async('getCurrentState', null, this.setCurrentState.bind(this));

        console.log('update');
    };

    this.setCurrentState = function(result){

        if(loaded == false){
            loaded = true;
            show_content();
        }

        var trunks = result.trunks;

        for (var i = 0; i < inc.length; i++) {
            if(inc[i].textContent != result.in) inc[i].textContent = result.in; 
        };
        for (var i = 0; i < out.length; i++) {
            if(out[i].textContent != result.out) out[i].textContent = result.out;
        };
        for (var i = 0; i < conn.length; i++) {
            if(conn[i].textContent != result.conn) conn[i].textContent = result.conn;
        };
        for (var i = 0; i < load.length; i++) {
            load[i].textContent = Math.round(result.load) + '%';
        };

        for (var i = 0; i < trunks.length; i++) {
            
            var className = trunks[i].enabled ? 'success' : 'danger';
            if(ttrunks.rows[i]){
                ttrunks.rows[i].cells[0].className = className;
                if(ttrunks.rows[i].cells[1].firstChild.textContent != trunks[i].name)
                    ttrunks.rows[i].cells[1].firstChild.textContent = trunks[i].name;
                if(ttrunks.rows[i].cells[2].textContent != trunks[i].in)
                    ttrunks.rows[i].cells[2].textContent = trunks[i].in;
                if(ttrunks.rows[i].cells[3].textContent != trunks[i].out)
                    ttrunks.rows[i].cells[3].textContent = trunks[i].out;
                ttrunks.rows[i].cells[4].textContent = Math.round(trunks[i].load) + '%';
            }
            else{
                row = ttrunks.insertRow(i);
                
                cell = row.insertCell(0);
                cell.className = className;

                cell = row.insertCell(1);
                a = document.createElement('a');
                a.href = '#trunk?'+trunks[i].oid;
                a.textContent = trunks[i].name;
                cell.appendChild(a);

                cell = row.insertCell(2);
                cell.textContent = trunks[i].in;

                cell = row.insertCell(3);
                cell.textContent = trunks[i].out;

                cell = row.insertCell(4);
                cell.textContent = Math.round(trunks[i].load) + '%';
            }

        };
        
    };

    this.setCurrentCalls = function(result){

        if(tcalls.rows.length > result.length) {
            this.clearTable(tcalls, result.length);
        }

        for (var i = 0; i < result.length; i++) {

            if(tcalls.rows[i]){
                tcalls.rows[i].cells[0].textContent = result[i].caller;
                tcalls.rows[i].cells[1].textContent = result[i].called;
                if(result[i].time)
                    tcalls.rows[i].cells[2].textContent = result[i].time;
            }
            else{
                row = tcalls.insertRow(i);
                
                cell = row.insertCell(0);
                cell.textContent = result[i].caller;

                cell = row.insertCell(1);
                cell.textContent = result[i].called;

                cell = row.insertCell(2);
                cell.textContent = result[i].time;
            }

        };

    };

    this.clearTable = function(table, rows){

        row = rows - 1;
        while(table.rows.length != rows){

            table.deleteRow(row);
            row = row - 1;

        }

    };

    this.stopUpdate = function(){
        console.log('update removed');
        clearInterval(this.update);
        removeEvent(window, 'hashchange', this.stopUpdate.bind(this));

    }

    this.init();

}

function load_calls(){

    PbxObject.CallsBoard = new CallsBoard();

}

/* 
 * Record Viewer object constructor.
 * Record Viewer allow to get calls data from CDR. 
 */

 function RecViewer(elements, picker){

    var picker = picker || 'dtPicker',
        seldays = document.getElementById('dtday'),
        selmonths = document.getElementById('dtmonth'),
        selyears = document.getElementById('dtyear'),
        selhours = document.getElementById('dthour'),
        selminutes = document.getElementById('dtmin'),
        number = document.getElementById('searchnum'),
        trunk = document.getElementById('searchtrunk'),
        rows = document.getElementById('searchrows'),
        elorder = document.querySelectorAll('.init-order'),
        elmode = document.querySelectorAll('.init-mode'),
        table = document.getElementById('records-table').querySelector('tbody');

    this.currentPicker = null;
    this.pickers = {};
    this.date = {};
    this.records = {};

    this._init = function(){

        var btn = document.getElementById('getcalls-btn'),
            setbtn = document.getElementById('set-picker');

        for (var i = 0; i < elements.length; i++) {
            addEvent(elements[i], 'click', this._showPicker.bind(this));
            if(elements[i].getAttribute('data-pickr') == 'from'){
                this.pickers.from = elements[i];
            }
            else if(elements[i].getAttribute('data-pickr') == 'to'){
                this.pickers.to = elements[i];
            }
        };

        addEvent(setbtn, 'click', this._setPicker.bind(this));
        addEvent(btn, 'click', this._getRecords.bind(this));

        this._fillFields();
        this.date.from = this._currentDate(null, null, null, '00', '00');
        this.date.to = this._currentDate();
        this._setResultDate();

    };

    this._setResultDate = function(){

        this.pickers.from.value = this._getStringDate(this.date.from);
        this.pickers.to.value = this._getStringDate(this.date.to);

        show_content();

    };

    this._currentDate = function(dday, mmonth, yyear, hhours, mminutes){

        var date = new Date();

        return {

            day: (function(){
                day = date.getDate();
                if(day < 10) day = '0' + day;
                return dday || day;
            })(),
            month: (function(){
                month = date.getMonth() + 1;
                if(month < 10) month = '0' + month;
                return mmonth || month;
            })(),
            year: (function(){
                return yyear || date.getFullYear();
            })(),
            hours: (function(){
                hours = date.getHours();
                if(hours < 10) hours = '0' + hours;
                return hhours || hours;
            })(),
            minutes: (function(){
                minutes = date.getMinutes();
                if(minutes < 10) minutes = '0' + minutes;
                return mminutes || minutes;
            })()
        }

    };

    this._fillFields = function(){

        var option = null,
            cyear = new Date().getFullYear();

        for(var i=1; i<32; i++){
            if(i<10) 
                this._addOption(seldays, '0' + i);
            else
                this._addOption(seldays, i);
        }
        for(var i=1; i<13; i++){
            if(i<10) 
                this._addOption(selmonths, '0' + i);
            else
                this._addOption(selmonths, i);
        }
        for(var i=2000; i<cyear+1; i++){
            if(i<10) 
                this._addOption(selyears, '0' + i);
            else
                this._addOption(selyears, i);
        }
    };

    this._showPicker = function(e){

        this.currentPicker = e.target;
        kind = e.target.getAttribute('data-pickr');

        seldays.value = this.date[kind].day;
        selmonths.value = this.date[kind].month;
        selyears.value = this.date[kind].year;
        selhours.value = this.date[kind].hours;
        selminutes.value = this.date[kind].minutes;

        $('#'+picker).modal({
            backdrop: false
        });
    };

    this._setPicker = function(){

        var now, 
            newDate,
            kind = this.currentPicker.getAttribute('data-pickr'),
            hours = selhours.value || '00',
            minutes = selminutes.value || '00',
            date = {
                day: seldays.options[seldays.selectedIndex].value,
                month: selmonths.options[selmonths.selectedIndex].value,
                year: selyears.options[selyears.selectedIndex].value,
                hours: hours,
                minutes: minutes
                // hours: selhours.options[selhours.selectedIndex].value,
                // minutes: selminutes.options[selminutes.selectedIndex].value
            };
        console.log(date);
        if(!date.day || !date.month || !date.year) return;

        now = Date.now();
        newDate = new Date(date.year, date.month - 1, date.day, date.hours, date.minutes);
        newDate = newDate.getTime();

        // if(newDate > now){
        //     alert(PbxObject.frases.pickrError1[PbxObject.lang]);
        //     return;
        // }

        this.date[kind] = date;
        this.pickers[kind].value = this._getStringDate(date);

        $('#'+picker).modal('hide');

    };

    this._getStringDate = function(date){

        var str = '';

        str += date.day + '/'; 
        str += date.month + '/';
        str += date.year;
        str += ' ';
        str += date.hours + ':';
        str += date.minutes;

        return str;

    };

    this._addOption = function(el, val){
        option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        el.appendChild(option);
    };

    this._getRecords = function(){
        
        var from = this.date.from,
            to = this.date.to,
            dbegin = new Date(from.year, from.month - 1, from.day, from.hours, from.minutes),
            dend = new Date(to.year, to.month - 1, to.day, to.hours, to.minutes),
            order, mode;

        for(var i=0; i<elorder.length; i++){
            if(elorder[i].checked)
                order = elorder[i].value;
        }
        for(var i=0; i<elmode.length; i++){
            if(elmode[i].checked)
                mode = elmode[i].value;
        }
        
        dbegin = dbegin.getTime();
        dend = dend.getTime();

        if(dbegin > dend){
            alert(PbxObject.frases.pickrError2[PbxObject.lang]);
            return;
        }

        var params = '';
        params += '"begin": ' + dbegin;
        params += ', "end": ' + dend;
        if(number.value)
            params += ', "number": "' + number.value + '"';
        if(trunk.value)
            params += ', "trunk": "' + trunk.value + '"';
        // if(rows.value)
        //     params += ', "limit": ' + parseInt(rows.value);
        if(mode)
            params += ', "mode": ' + mode;
        if(order)
            params += ', "order": ' + order;

        // params = JSON.stringify(params);
        console.log(params);
        json_rpc_async('getCalls', params, this._showRecords.bind(this));

    };

    this._showRecords = function(result){
        console.log(result);

        // if(!rows.value && result.length > 50) rows.value = 50;
        var rlength = rows.value ? parseInt(rows.value) : result.length,
            pagnum = result.length > rlength ? Math.ceil(result.length / rlength) : 0,
            pagin = document.querySelector('.pagination');

        this.records = result;

        while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
        }

        while (pagin.hasChildNodes()) {
            pagin.removeChild(pagin.firstChild);
        }

        if(pagnum > 0){
            for (var i = 1; i <= pagnum; i++) {
                var li = document.createElement('li'),
                a = '<a href="#">'+i+'</a>';
                li.innerHTML = a;
                addEvent(li, 'click', this._paginRecords.bind(this));
                pagin.appendChild(li);
            }
        }

        for (var i = 0; i < rlength; i++) {
            build_records_row(result[i], table);
        };

        var key, cost = 0;
        for (var i = 0; i < result.length; i++) {
            for(key in result[i]){
                if(key == 'ch'){
                    cost += result[i][key];
                }
            }
        };

        $('#sample-data').show();
        $('#sample-length').text(result.length);
        $('#sample-cost').text(cost);

    }

    this._paginRecords = function(e){

        e.preventDefault();

        var targ = e.target;
            ind = parseInt(targ.textContent) * parseInt(rows.value) - parseInt(rows.value),
            len = targ.textContent * parseInt(rows.value);

        len = len < this.records.length ? len : this.records.length;

        while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
        }
        for (var i = ind; i < len; i++) {
            build_records_row(this.records[i], table);
        };

    }

    this._init();

 }

function load_records(){

    var pickers = document.querySelectorAll('.dt-pickr');
    PbxObject.RecViewer = new RecViewer(pickers);
    $('#sample-data').hide();
    $('#search-calls .panel-body').slideToggle();
    $('#extendedsearch').click(function(e){
        e.preventDefault();
        var $panel = $(this).closest('.panel'),
            $el = $panel.find('.panel-body');

        if(($el).is(':visible')){
            $(this).text(PbxObject.frases.more[PbxObject.lang]);
        }
        else{
            $(this).text(PbxObject.frases.less[PbxObject.lang]);
        }

        $el.slideToggle();
    });

}

function build_records_row(data, table){

    var cell,
        lrow = table.rows.length,
        row = table.insertRow(lrow),
        ts = parseInt(data['ts']),
        date = new Date(ts),
        day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate(),
        month = date.getMonth() < 10 ? '0' + (date.getMonth()+1) : date.getMonth()+1,
        hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours(),
        minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes(),
        time = data['td'], h, m, s;

    cell = row.insertCell(0);
    date = day + '/' + month + '/' + date.getFullYear() + ' ' + hours + ':' + minutes;
    cell.textContent = date;

    cell = row.insertCell(1);
    cell.textContent = data['na'];

    cell = row.insertCell(2);
    cell.textContent = data['nb'];

    cell = row.insertCell(3);
    cell.textContent = data['nc'];

    cell = row.insertCell(4);
    if(data['ta']) cell.textContent = data['ta'];

    cell = row.insertCell(5);
    if(data['tb']) cell.textContent = data['tb'];

    cell = row.insertCell(6);
    h = Math.floor(time / 3600);
    time = time - h * 3600;
    m = Math.floor(time / 60);
    s = time - m * 60;
    cell.textContent = (h < 10 ? '0'+h : h) + ':' + (m < 10 ? '0'+m : m) + ':' + (s < 10 ? '0'+s : s);

    cell = row.insertCell(7);
    cell.textContent = getFriendlyCodeName(data['cs']);

    cell = row.insertCell(8);
    cell.textContent = data['tr'];

    cell = row.insertCell(9);
    cell.textContent = data['ch'];
}

function getFriendlyCodeName(code){

    var name = '';
    switch(code){
        case '1':
            name = PbxObject.frases.codes.one[PbxObject.lang];
            break;
        case '3':
            name = PbxObject.frases.codes.three[PbxObject.lang];
            break;
        case '16':
            name = PbxObject.frases.codes.sixteen[PbxObject.lang];
            break;
        case '17':
            name = PbxObject.frases.codes.seventeen[PbxObject.lang];
            break;
        case '18':
            name = PbxObject.frases.codes.eighteen[PbxObject.lang];
            break;
        case '19':
            name = PbxObject.frases.codes.nineteen[PbxObject.lang];
            break;
        case '21':
            name = PbxObject.frases.codes.twentyone[PbxObject.lang];
            break;
        case '22':
            name = PbxObject.frases.codes.twentytwo[PbxObject.lang];
            break;
        case '28':
            name = PbxObject.frases.codes.twentyeight[PbxObject.lang];
            break;
        default:
            name = code;
    }
    return name;

}

/* 
 * Setting ui for PBX group
 */

function load_bgroup(result){
    console.log(result);
    switch_tab(result.kind);
    var i, cl, enabled, 
        d = document, 
        kind = result.kind, 
        options = d.getElementById('options');

    PbxObject.oid = result.oid;
    PbxObject.kind = kind;
    PbxObject.name = result.name;

    if(kind == 'conference'){
        var formats = [ "OFF", "320x240", "352x288", "640x360", "640x480", "704x576", "1024x768", "1280x720", "1920x1080" ];
        PbxObject.videomax = result.maxvideomode;
    }
    enabled = document.getElementById('enabled');
    if(enabled)
        enabled.checked = result.enabled;
    fill_list_items('available', result.available);
    fill_list_items('members', result.members);

    d.getElementById('extensions').parentNode.style.display = '';
    if(kind == 'icd' || kind == 'conference'){
        if(kind == 'icd') {
            cl = 'conf-options';
        }
        else cl = 'icd-options';
        var p = options.getElementsByClassName(cl);
        i = p.length;
        while(i--){
            var col = p[i].parentNode;
            col.parentNode.removeChild(col);
        }
        var profile = d.getElementById('profile');
        profile.parentNode.removeChild(profile);
    }
    else {
        options.parentNode.removeChild(options);
    }

    if(result.name) {
        d.getElementById('objname').value = result.name;
    }
    if(result.options){
        if(kind == 'equipment'){
            var eqtype = result.options.kind || 'ipphones';
            d.getElementById(eqtype).checked = true;
            if(result.options.kind == 'gateway'){
                d.getElementById('regname').value = result.options.regname || '';
                d.getElementById('regpass').value = result.options.regpass || '';
            }
            else if(result.options.kind == 'trunk'){
                d.getElementById('username').value = result.options.regname || '';
                d.getElementById('password').value = result.options.regpass || '';
                d.getElementById('address').value = result.options.address || '';
            }
            d.getElementById('phonelines').value = result.options.phonelines || '1';
            if(result.options.starflash != undefined){
                d.getElementById('starflash').checked = result.options.starflash;
            }
        }
        else if(kind == 'unit'){
            d.getElementById("groupno1").value = result.options.groupno || '';
            d.getElementById("timeout1").value = result.options.timeout || '';
            if(result.options.huntmode)
                d.getElementById("huntmode1").selectedIndex = result.options.huntmode;
            if(result.options.huntfwd)
                d.getElementById("huntfwd1").checked = result.options.huntfwd;
        }
        else if(kind == 'hunting'){
            if(result.options.timeout)
                d.getElementById("timeout2").value = result.options.timeout;
            if(result.options.huntmode)
                d.getElementById("huntmode2").selectedIndex = result.options.huntmode;
            if(result.options.huntfwd)
                d.getElementById("huntfwd2").checked = result.options.huntfwd;
        }
        else if(kind == 'pickup'){
            d.getElementById("groupno2").value = result.options.groupno || '';
        }
        else if(kind == 'icd'){
            d.getElementById("groupno").value = result.options.groupno || '';
            d.getElementById("maxlines").value = result.options.maxlines || '';
            d.getElementById("priority").value = result.options.priority || '';
            d.getElementById("canpickup").checked = result.options.canpickup;
            d.getElementById("autologin").checked = result.options.autologin;
            d.getElementById("method").selectedIndex = result.options.method;
            d.getElementById("natimeout").value = result.options.natimeout || '';
            d.getElementById("resumetime").value = result.options.resumetime || '';
            d.getElementById("queuelen").value = result.options.queuelen || '';
            d.getElementById("maxqwait").value = result.options.maxqwait || '';
            d.getElementById("overflowredirect").value = result.options.overflowredirect || '';
            d.getElementById("overtimeredirect").value = result.options.overtimeredirect || '';
            d.getElementById("indicationmode").value = result.options.indicationmode || '';
            d.getElementById("indicationtime").value = result.options.indicationtime || '';
            
            //customizing upload element
            customize_upload('greeting', result.options.greeting);
        }
        else if(kind == 'conference'){
            //customizing upload element
            customize_upload('onhold2', null);
            customize_upload('greeting2', null);
            
            d.getElementById("dialuptt").value = result.options.dialtimeout || '';
            d.getElementById("autoredial").checked = result.options.autoredial;
            d.getElementById("confrecord").checked = result.options.recording;
            var greet = d.getElementById("playgreet");
            greet.checked = result.options.greeting;
            if(greet.checked) 
                greet.checked = result.options.greetingfile ? true : false;
                
            var modes = d.getElementById("conf-init-mode").getElementsByClassName('init-mode');
            for(i=0;i<modes.length;i++){
                if(result.options.initmode == modes[i].value){
                    modes[i].checked = true;
                }
            }
            var select = d.getElementById("videoform");
            for(i=0;i<formats.length;i++){
                var op = d.createElement('option');
                op.value = formats[i];
                op.innerHTML = formats[i];
                select.appendChild(op);
                if(formats[i] == result.options.videomode) {
                    select.selectedIndex = i;
                }
                if(formats[i] == result.options.maxvideomode) {
                    break;
                }
            }
        }
    }

    if(result.profile != undefined){
        d.getElementById('hold').checked = result.profile.hold;
        d.getElementById('forwarding').checked = result.profile.forwarding;
        d.getElementById('callpickup').checked = result.profile.callpickup;
        d.getElementById('dndover').checked = result.profile.dndover;
        d.getElementById('busyover').checked = result.profile.busyover;
        d.getElementById('monitor').checked = result.profile.monitor;
        d.getElementById('dnd').checked = result.profile.dnd;
        d.getElementById('clir').checked = result.profile.clir;
        d.getElementById('pickupdeny').checked = result.profile.pickupdeny;
        d.getElementById('busyoverdeny').checked = result.profile.busyoverdeny;
        d.getElementById('monitordeny').checked = result.profile.monitordeny;
        d.getElementById('callwaiting').checked = result.profile.callwaiting;
        d.getElementById('outcallbarring').checked = result.profile.outcallbarring;
        d.getElementById('costroutebarring').checked = result.profile.costroutebarring;
        d.getElementById('hold').checked = result.profile.hold;

        var transforms = result.profile.bnumbertransforms;
        if(transforms.length != 0){
            for(i=0; i<transforms.length; i++){
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
        alert(PbxObject.frases.missedNameField[PbxObject.lang]);
        return false;
    }
    
    show_loading_panel();
    
    var handler;
    if(PbxObject.name) {
        handler = set_object_success;
    }
    else{
        PbxObject.name = name;
        // handler = set_new_object;
        handler = null;
    }

    var oid = PbxObject.oid;
    if(oid) jprms += '"oid":"'+oid+'",';
    
    var kind = PbxObject.kind;
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
        if(d.getElementById("forwarding") != null){
            jprms += '"forwarding":'+d.getElementById("forwarding").checked+",";
        }
        if(d.getElementById("callpickup") != null){
            jprms += '"callpickup":'+d.getElementById("callpickup").checked+",";
        }
        if(d.getElementById("dndover") != null){
            jprms += '"dndover":'+d.getElementById("dndover").checked+",";
        }
        if(d.getElementById("busyover") != null){
            jprms += '"busyover":'+d.getElementById("busyover").checked+",";
        }
        if(d.getElementById("monitor") != null){
            jprms += '"monitor":'+d.getElementById("monitor").checked+",";
        }
        if(d.getElementById("dnd") != null){
            jprms += '"dnd":'+d.getElementById("dnd").checked+",";
        }
        if(d.getElementById("clir") != null){
            jprms += '"clir":'+d.getElementById("clir").checked+",";
        }
        if(d.getElementById("callwaiting") != null){
            jprms += '"callwaiting":'+d.getElementById("callwaiting").checked+",";
        }
        if(d.getElementById("pickupdeny") != null){
            jprms += '"pickupdeny":'+d.getElementById("pickupdeny").checked+",";
        }
        if(d.getElementById("monitordeny") != null){
            jprms += '"monitordeny":'+d.getElementById("monitordeny").checked+",";
        }
        if(d.getElementById("busyoverdeny") != null){
            jprms += '"busyoverdeny":'+d.getElementById("busyoverdeny").checked+",";
        }
        if(d.getElementById("recording") != null){
            jprms += '"recording":'+d.getElementById("recording").checked+",";
        }
        if(d.getElementById("voicemail") != null){
            jprms += '"voicemail":'+d.getElementById("voicemail").checked+",";
        }
        if(d.getElementById("outcallbarring") != null){
            jprms += '"outcallbarring":'+d.getElementById("outcallbarring").checked+",";
        }
        if(d.getElementById("costroutebarring") != null){
            jprms += '"costroutebarring":'+d.getElementById("costroutebarring").checked+",";
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
    if(kind == 'equipment'){
        if(d.getElementById("ipphones").checked){
            jprms += '"kind":"ipphones",';
        }
        else if(d.getElementById("gateway").checked){
            jprms += '"kind":"gateway",';
            jprms += '"regname":"'+d.getElementById("regname").value+'",';
            jprms += '"regpass":"'+d.getElementById("regpass").value+'",';
        }
        else if(d.getElementById("trunk").checked){
            jprms += '"kind":"trunk",';
            jprms += '"address":"'+d.getElementById("address").value+'",';
            jprms += '"regname":"'+d.getElementById("username").value+'",';
            jprms += '"regpass":"'+d.getElementById("password").value+'",';
        }
        if(d.getElementById("phonelines") != null){
            jprms += '"phonelines":'+d.getElementById("phonelines").value+',';
        }
        if(d.getElementById("starflash") != null){
            jprms += '"starflash":'+d.getElementById("starflash").checked+',';
        }
    }
    else if(kind == 'unit'){
        jprms += '"groupno":"'+d.getElementById("groupno1").value+'",';
        jprms += '"timeout":'+d.getElementById("timeout1").value+',';
        jprms += '"huntmode":'+d.getElementById("huntmode1").value+',';
        jprms += '"huntfwd":'+d.getElementById("huntfwd1").checked+',';
    }
    else if(kind == 'hunting'){
        jprms += '"timeout":'+d.getElementById("timeout2").value+',';
        jprms += '"huntmode":'+d.getElementById("huntmode2").value+',';
        jprms += '"huntfwd":'+d.getElementById("huntfwd2").checked+',';
    }
    else if(kind == 'pickup'){
        jprms += '"groupno":"'+d.getElementById("groupno2").value+'",';
    }
    else if(kind == 'icd'){
        jprms += '"groupno":"'+d.getElementById("groupno").value+'",';
        jprms += '"maxlines":'+d.getElementById("maxlines").value+',';
        jprms += '"priority":'+d.getElementById("priority").value+',';
        jprms += '"canpickup":'+d.getElementById("canpickup").checked+',';
        jprms += '"autologin":'+d.getElementById("autologin").checked+',';
        jprms += '"method":'+d.getElementById("method").value+',';
        jprms += '"natimeout":'+d.getElementById("natimeout").value+',';
        jprms += '"resumetime":'+d.getElementById("resumetime").value+',';
        jprms += '"queuelen":'+d.getElementById("queuelen").value+',';
        jprms += '"overflowredirect":"'+d.getElementById("overflowredirect").value+'",';
        jprms += '"maxqwait":'+d.getElementById("maxqwait").value+',';
        jprms += '"overtimeredirect":"'+d.getElementById("overtimeredirect").value+'",';
        jprms += '"indicationmode":'+d.getElementById("indicationmode").value+',';
        jprms += '"indicationtime":'+d.getElementById("indicationtime").value+',';
        var file = document.getElementById("greeting");
        if(file.value){
            jprms += '"greeting":"'+file.files[0].name+'",';
            upload('greeting');
        }
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
    if(listid == 'available' || (PbxObject.kind != 'hunting' && PbxObject.kind != 'icd' && PbxObject.kind != 'unit')) {
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
 * UI for PBX applications
 */

function load_application(result){
    PbxObject.oid = result.oid;
    PbxObject.name = result.name;    
    if(result.name){
        document.getElementById('objname').value = result.name;
    }
    if(result.enabled)
        document.getElementById('enabled').checked = result.enabled;
    if(result.debug)
        document.getElementById('debug').checked = result.debug;
    if(result.status)
        document.getElementById('status').innerHTML = result.status;
    if(result.dbconnection){
        var db = result.dbconnection;
        if(db.driver == 'sun.jdbc.odbc.JdbcOdbcDriver'){
            document.getElementById('odbc').checked = true;
            if(db.url)
                document.getElementById('odbcurl').value = db.url;
        }
        else if(db.driver){
            document.getElementById('jdbc').checked = true;
            document.getElementById('jdbcdriver').value = db.driver;
            if(db.url)
                document.getElementById('jdbcurl').value = db.url;
        }
        if(db.schema)
            document.getElementById('dbowner').value = db.schema;
        if(db.username)
            document.getElementById('dbuser').value = db.username;
        if(db.password)
            document.getElementById('dbpass').value = db.password;
    }
    
    var vars = result.parameters;
    if(vars.length){
        for(var i=0; i<vars.length; i++){
            add_app_row(vars[i]);
        }
    }
    else{
        add_app_row();
    }
    
    show_content();
    set_page();
}

//function set_object(){
function set_application(){
    show_loading_panel();
    
    if(PbxObject.oid) jprms += '"oid":"'+PbxObject.oid+'",';
    var jprms = '\"name\":\"'+document.getElementById('objname').value+'\",';
    jprms += '"enabled":'+document.getElementById('enabled').checked+',';
    if(PbxObject.oid) jprms += '\"oid\":\"'+PbxObject.oid+'\",';
    
    var tbody = document.getElementById('appvariables').getElementsByTagName('tbody')[0];
    jprms += '\"parameters\":[';
    var i, j;
    for(i=0; i<tbody.children.length; i++){
        var tr = tbody.children[i];
        var inputs = tr.getElementsByTagName('input');
        var str = '';
        for(j=0;j<inputs.length;j++){
            if(inputs[j].name == 'variable'){
                str += '"key":"'+inputs[j].value+'",';
            }
            else if(inputs[j].name == 'value') {
                str += '"value":"'+inputs[j].value+'",';
            }
            else 
                continue;
        }
        if(str != '') {
            jprms += '{'+str+'},';
        }
    }
    jprms += '],';
    jprms += '"debug":'+document.getElementById('debug').checked+',';
    jprms += '"dbconnection":{';
    var driver, url;
    if(document.getElementById('odbc').checked){
        driver = 'sun.jdbc.odbc.JdbcOdbcDriver';
        url = document.getElementById('odbcurl').value;
    }
    else{
        driver = document.getElementById('jdbcdriver').value;
        url = document.getElementById('jdbcurl').value;
    }
    jprms += '"driver":"'+driver+'",';
    jprms += '"url":"'+url+'",';
    
    if(document.getElementById('dbowner'))
        jprms += '"schema":"'+document.getElementById('dbowner').value+'",';
    if(document.getElementById('dbuser'))
        jprms += '"username":"'+document.getElementById('dbuser').value+'",';
    if(document.getElementById('dbpass'))
        jprms += '"password":"'+document.getElementById('dbpass').value+'",';
    jprms += '},';
    
    json_rpc_async('setObject', jprms, set_object_success);
}

function add_app_row(object){
    
    var table = document.getElementById('appvariables').getElementsByTagName('tbody')[0];
    var tr = document.createElement('tr');
    
    var td = document.createElement('td');
    var div = document.createElement('div');
    div.className = 'form-group';
    var cell = document.createElement('input');
    cell.className = 'form-control';
    cell.setAttribute('type', 'text');
    cell.setAttribute('name', 'variable');
    cell.setAttribute('disabled', 'disabled');
    if(object && object.key) cell.value = object.key;
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);
    table.appendChild(tr);
    
    td = document.createElement('td');
    div = document.createElement('div');
    div.className = 'form-group';
    cell = document.createElement('input');
    cell.className = 'form-control';
    cell.setAttribute('name', 'value');
    if(object && object.value) cell.value = object.value;
    div.appendChild(cell);
    td.appendChild(div);
    tr.appendChild(td);
    table.appendChild(tr);
    
    table.appendChild(tr);
}

/* 
 * UI from CLI group
 */

//function load_object(result){
function load_cli(result){
    PbxObject.oid = result.oid;
    PbxObject.name = result.name;
    PbxObject.kind = 'cli';
    if(result.name) {
        document.getElementById('objname').value = result.name;
    }
    
    document.getElementById('enabled').checked = result.enabled;
    
    var transforms = result.bnumbertransforms;
    if(transforms.length) {
        for(var i=0; i<transforms.length; i++){
            append_transform(null, 'transforms1', transforms[i]);
        }
    }
    else { 
        append_transform(null, 'transforms1');
    }
    
    var numbers = result.numbers;
    if(numbers.length){
        for(i=0; i<numbers.length; i++){
            add_cli_row(numbers[i]);
        }
    }
    else{
        add_cli_row();
    }

    show_content();
    set_page();
}

function set_cli(){
        
    var name = document.getElementById('objname').value;
    if(name)
        var jprms = '\"name\":\"'+name+'\",';
    else{
        alert('Object name must be filled');
        return false;
    }
        
    show_loading_panel();
    
    var handler;
    if(PbxObject.name) {
        handler = set_object_success;
    }
    else{
        PbxObject.name = name;
        // handler = set_new_object;
        handler = null;
    }
    
    if(PbxObject.oid) jprms += '\"oid\":\"'+PbxObject.oid+'\",';
    jprms += '\"kind\":\"cligroup\",';
    jprms += '\"enabled\":'+document.getElementById('enabled').checked+',';
    
    jprms += '\"bnumbertransforms\":[';
    jprms += encode_transforms('transforms1');
    jprms += '],';
    
    jprms += '\"numbers\":[';
    var i, tbody = document.getElementById('clinumbers').getElementsByTagName('tbody')[0];
    for(i=0; i<tbody.children.length; i++){
        var tr = tbody.children[i];
        var str = '';
        
        var inp = tr.getElementsByTagName('input')[0];
        if(inp && inp.name == 'number') {
            str += '"number":"'+inp.value+'",';
        }
        var ta = tr.getElementsByTagName('textarea')[0];
        if(ta && ta.name == 'description') {
            str += '"description":"'+ta.value+'",';
        }
        
        if(str != '') {
            jprms += '{'+str+'},';
        }
    }
    jprms += ']';
        
    json_rpc_async('setObject', jprms, handler);     
}

function add_cli_row(object){
    
    var e = e || window.event;
    if(e.type == 'click')
        e.preventDefault();

    var table = document.getElementById('clinumbers').getElementsByTagName('tbody')[0],
        lrow = table.rows.length,
        row = table.insertRow(lrow),
        cell, div, inp;
    // var tr = document.createElement('tr');
    
    // var td = document.createElement('td');
    cell = row.insertCell(0);
    div = document.createElement('div');
    div.className = 'form-group';
    inp = document.createElement('input');
    inp.className = 'form-control';
    inp.setAttribute('type', 'text');
    inp.setAttribute('name', 'number');
    if(object && object.number) inp.value = object.number;
    div.appendChild(inp);
    cell.appendChild(div);
    // tr.appendChild(td);
    // table.appendChild(tr);
    
    // td = document.createElement('td');
    cell = row.insertCell(1);
    div = document.createElement('div');
//    div.className = 'col-xs-6';
    div.className = 'form-group';
    inp = document.createElement('textarea');
    inp.className = 'form-control y-resizable';
    inp.setAttribute('rows', '3');
//    cell.setAttribute('type', 'text');
    inp.setAttribute('name', 'description');
    if(object && object.description) inp.value = object.description;
    div.appendChild(inp);
    cell.appendChild(div);
    // tr.appendChild(td);
    // table.appendChild(tr);
    
    // td = document.createElement('td');
    cell = row.insertCell(2);
    div = document.createElement('div');
    div.className = 'form-group';
//    div.className = 'col-xs-2';
    inp = document.createElement('a');
    inp.href = '#';
    // cell.setAttribute('type', 'checkbox');
    inp.className = 'remove-clr';
    inp.innerHTML = '<i class="glyphicon glyphicon-remove"></i>';
    addEvent(inp, 'click', remove_row);
    div.appendChild(inp);
    cell.appendChild(div);
    // tr.appendChild(td);
    // table.appendChild(tr);
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

function createExtRow(ext, oid, kind, status, name, group, reg){

    var row = document.createElement('tr'),
        cell, a, newkind;

    cell = row.insertCell(0);
    if(oid){
        a = document.createElement('a');
        if(kind == 'user' || kind == 'phone') {
            a.href = '#';
            addEvent(a, 'click', get_extension);
        } else {
            a.href = '#' + kind + '?' + oid;
        }
        a.textContent = ext;
        cell.appendChild(a);
    } else {
        cell.textContent = ext;
    }
    
    cell = row.insertCell(1);
    cell.textContent = name || "";

    cell = row.insertCell(2);
    cell.textContent = group || "";
    
    cell = row.insertCell(3);
    cell.textContent = reg || "";

    cell = row.insertCell(4);
    cell.textContent = kind || "";

    cell = row.insertCell(5);
    cell.textContent = status || "";

    cell = row.insertCell(6);
    if(kind == 'user' || kind == 'phone') {
        button = document.createElement('button');
        button.className = 'btn btn-primary btn-sm';
        button.innerHTML = '<i class="glyphicon glyphicon-edit"></i>';
        addEvent(button, 'click', editExtension);
        cell.appendChild(button);
    }    
    cell = row.insertCell(7);
    if(oid) {
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
    var row, obj, oid, ext, kind, state, info, status, className, name, group, reg,
        table = document.getElementById('extensions').getElementsByTagName('tbody')[0],
        fragment = document.createDocumentFragment();

    PbxObject.extensions = result;

    for(var i=0; i<result.length; i++){

        obj = result[i];

        oid = obj.oid;
        ext = obj.ext;
        kind = obj.kind;
        state = obj.state;
        group = obj.group;
        info = getInfoFromState(state, group);
        status = info.rstatus;
        className = info.rclass;
        name = obj.name;
        reg = obj.reg;

        // lrow = table.rows.length;
        // row = table.insertRow(lrow);
        row = createExtRow(ext, oid, kind, status, name, group, reg);
        row.id = ext;
        row.setAttribute('data-oid', oid);
        row.className = className;

        fragment.appendChild(row);

        // cell = row.insertCell(0);
        // a = document.createElement('a');
        // if(result[i].oid){
        //     if(result[i].kind == 'user' || result[i].kind == 'phone'){
        //         a.href = '#';
        //         a.setAttribute('data-oid', result[i].oid);
        //         addEvent(a, 'click', get_extension);
        //     }
        //     else{
        //         a.href = '#' + result[i].kind + '?' + result[i].oid;
        //     }
                
        // }
        
        // a.innerHTML = result[i].ext;
        // cell.appendChild(a);
        
        // cell = row.insertCell(1);
        // cell.innerHTML = result[i].name || "";
        
        // cell = row.insertCell(2);
        // cell.innerHTML = result[i].group;
        
        // cell = row.insertCell(3);
        // cell.innerHTML = result[i].reg;

        // cell = row.insertCell(4);
        // cell.innerHTML = result[i].kind;

        // cell = row.insertCell(5);
        // if(status) cell.innerHTML = status;
        
        // cell = row.insertCell(6);
        // a = document.createElement('a');
        // a.href = '#';
        // a.innerHTML = '<i class="glyphicon glyphicon-pencil"></i>';
        // addEvent(a, 'click', editExtension);
        // cell.appendChild(a);

        // cell = row.insertCell(7);
        // button = document.createElement('button');
        // button.className = 'btn btn-danger btn-sm';
        // button.innerHTML = '<i class="glyphicon glyphicon-trash"></i>';
        // if(state == -1){
        //     button.setAttribute('disabled', 'true');
        // }
        // else{
        //     addEvent(button, 'click', delete_extension);
        // }
        
        // cell.appendChild(button);
    }
        
    table.appendChild(fragment);
    // var ref = document.getElementById('extrefresh');
    // ref.onclick = function(){
    //     update_extansions();
    // };
    // var rep = document.getElementById('extrepeat');
    // rep.onclick = function(){
    //     set_update_interval();
    // };
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

    for(var ext in PbxObject.extensions){

        if(PbxObject.extensions[ext].oid === data.oid || PbxObject.extensions[ext].ext === data.ext){
            var ext = PbxObject.extensions[ext];
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
    PbxObject.kind = kind;
    PbxObject.oid = result.oid;
    
    
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
        oid = PbxObject.oid,
        kind = PbxObject.kind;
    
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

// function update_extansions(event){
//     var event = event || window.event;
//     $('#extrefresh').addClass('spinner');
//     json_rpc_async('getExtensions', null, update_extansions_);
//     if(event) event.preventDefault();
// }
// function set_update_interval(event){
//     var event = event || window.event;
//     var button = document.getElementById('extrepeat');
//     if(PbxObject.updext){
//         clearInterval(PbxObject.updext);
//         PbxObject.updext = false;
//         if(button) button.className = '';
//     }
//     else{
//         PbxObject.updext = setInterval(function(){update_extansions();}, 5000);
//         if(button) button.className = 'nav-active';
//     }
//     event.preventDefault();
// }

// function update_extansions_(result){
//     var obj, state, row, cells, status,
//         table = document.getElementById('extensions');
//         if(table) {
//             var tbody = table.getElementsByTagName('tbody')[0],
//                 trows = tbody.rows;
//         }
//         else 
//             return;
//     for(var i=0;i<result.length;i++){
//         obj = result[i];
//         state = obj.state;
//         for(var j=0;j<trows.length;j++){
//             row = trows[j];
//             cells = row.cells;
//             if(obj.ext == row.getAttribute('data-ext')){
//                 if(state == 0){
//                     status = 'Registered';
//                     row.className = 'success';
//                 }
//                 else if(state == 3){
//                     status = 'Connected';
//                     row.className = 'connected';
//                 }
//                 else if(state == 6){
//                     status = 'Forwarding';
//                     row.className = 'warning';
//                 }
//                 else if(state == 5){
//                     status = '';
//                     row.className = '';
//                 }
//                 else if(state == 4){
//                     status = 'Do not disturb';
//                     row.className = 'danger';
//                 }
//                 else if(state == 1 || state == 2){
//                     status = state == 1 ? 'Dialing' : 'Ringing';
//                     row.className = 'info';
//                 }
//                 else{
//                     status = '';
//                     row.className = 'active';
//                 }
//                 if(cells[1].innerHTML != obj.name) {
//                     cells[1].innerHTML = obj.name || "";
//                 }
//                 if(cells[2].innerHTML != obj.group) {
//                     cells[2].innerHTML = obj.group;
//                 }
//                 if(cells[3].innerHTML != obj.reg) {
//                     cells[3].innerHTML = obj.reg;
//                 }
//                 if(cells[4].innerHTML != obj.kind) {
//                     cells[4].innerHTML = obj.kind;
//                 }
//                 if(cells[5].innerHTML != status) {
//                     cells[5].innerHTML = status;
//                 }
//                 if(state == -1 && !cells[6].children[0].getAttribute('disabled')){
//                     cells[6].children[0].setAttribute('disabled', 'disabled');
//                 }
//                 else if(state != -1 && cells[6].children[0].getAttribute('disabled')){
//                     cells[6].children[0].removeAttribute('disabled');
//                 }
//             }
//         }
//     }
//     $('#extrefresh').removeClass('spinner');
// }

/* 
 * UI for PBX routing tables
 */

function load_routes(result){
    console.log(result);
    
    PbxObject.oid = result.oid;
    PbxObject.kind = 'routes';
    PbxObject.routepriorities = [
        "Max. prefix length",
        "Least cost routing",
        "Load balancing",
        "Answer seizure ratio",
        "Average call duration",
        "Most idle gateway",
        "Least utilised gateway",
        "Max. priority (status)"    
    ];
    PbxObject.name = result.name;
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
        li.innerHTML = PbxObject.routepriorities[priorities[i]];
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
    if(PbxObject.name) {
        handler = set_object_success;
    }
    else{
        PbxObject.name = name;
        // handler = set_new_object;
        handler = null;
    }
    
    if(PbxObject.oid) jprms += '\"oid\":\"'+PbxObject.oid+'\",';
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
 * UI for PBX timers
 */

function load_timer(result){
    PbxObject.oid = result.oid;
    PbxObject.name = result.name;
    PbxObject.kind = 'timer';
    
    if(result.name){
        document.getElementById('objname').value = result.name;
    }
    document.getElementById('enabled').checked = result.enabled;
    var i;
    var hours = document.getElementById('hh');
    for(i=0;i<24;i++){
        var opt = document.createElement('option');
        if(i<10)
            var value = '0'+i;
        else
            value = i;
        opt.value = value;
        opt.innerHTML = value;
        hours.appendChild(opt);
        if(value == result.hour) {
            hours.selectedIndex = i;
        }
    }
    var minutes = document.getElementById('mm');
    for(i=0;i<=55;i+=5){
        var opt = document.createElement('option');
        if(i<10)
            var value = '0'+i;
        else
            value = i;
        opt.value = value;
        opt.innerHTML = value;
        minutes.appendChild(opt);
        if(value == result.minute) {
            minutes.selectedIndex = i/5;
        }
    }
    for(i=0; i<result.weekdays.length; i++){
        document.getElementById('d'+result.weekdays[i]).checked = true;
    }
    
    fill_timer_targets('objects');
    
    var targets = document.getElementById('targets').getElementsByTagName('tbody')[0];
    for(i=0; i < result.targets.length; i++){
        targets.appendChild(timer_target_row(result.targets[i].oid, result.targets[i].name, result.targets[i].action));
    }
    
    show_content();
    set_page();

    var add = document.getElementById('add-timer-target');
    add.onclick = function(){
        add_timer_target();
    };
    
    var everyd = document.getElementById('timer-everyday');
    addEvent(everyd, 'click', check_days);
    var workd = document.getElementById('timer-workdays');
    addEvent(workd, 'click', check_days);
    var holid = document.getElementById('timer-holidays');
    addEvent(holid, 'click', check_days);
    
}

function set_timer(){
        
    var jprms, name = document.getElementById('objname').value;
    if(name)
        jprms = '\"name\":\"'+name+'\",';
    else{
        alert('Object name must be filled');
        return false;
    }
    
    show_loading_panel();
    
    var handler;
    if(PbxObject.name) {
        handler = set_object_success;
    }
    else{
        PbxObject.name = name;
        // handler = set_new_object;
        handler = null;
    }
    
    if(PbxObject.oid != null) {
        jprms += '\"oid\":\"'+PbxObject.oid+'\",';
    }
    jprms += '\"kind\":\"timer\",';
    var enabled = document.getElementById('enabled');
    if(enabled != null) {
        jprms += '\"enabled\":'+enabled.checked+',';
    }
    var h = document.getElementById('hh');
    var m = document.getElementById('mm');
    jprms += '\"hour\":\"'+h.options[h.selectedIndex].value+'\",';
    jprms += '\"minute\":\"'+m.options[m.selectedIndex].value+'\",';

    jprms += '\"weekdays\":[';
    var i;
    for(i=0; i<7; i++){
        if(document.getElementById('d'+i).checked){
            jprms += i+',';
        }
    }
    jprms += '],';

    var targets = document.getElementById('targets').getElementsByTagName('tbody')[0];
    
    jprms += '\"targets\":[';
    for(i=0; i < targets.children.length; i++){
        var tr = targets.children[i];
        if(tr.id != undefined && tr.id != ''){
            jprms += '{\"oid\":\"'+targets.children[i].id+'\",\"action\":\"'+tr.children[1].innerHTML+'\"},';
        }
    }
    jprms += ']';
    
    json_rpc_async('setObject', jprms, handler); 
}

function timer_target_row(oid, name, action){
    var tr = document.createElement('tr');
    tr.id = oid;
    var td = document.createElement('td');
    var a = document.createElement('a');
    a.href = '#';
    a.onclick = function(e){
        get_object_link(oid);
        e.preventDefault();
    };
    a.innerHTML = name;
    td.appendChild(a);
    tr.appendChild(td);
    td = document.createElement('td');
    td.innerHTML = action;
    tr.appendChild(td);
    td = document.createElement('td');
    var button = document.createElement('button');
    button.className = 'btn btn-danger btn-sm';
    button.innerHTML = 'Del';
    button.onclick = function(){
        remove_listener(oid);
    };
    td.appendChild(button);
    tr.appendChild(td);
    return tr;
}

function add_timer_target() {
    var table = document.getElementsByTagName('tbody')[0];
    var select = document.getElementById('objects');
    var action = document.getElementById('actions');
    var opt = select.options[select.selectedIndex];
    table.appendChild(timer_target_row(opt.value, opt.innerHTML, action.value));
}

function remove_listener(oid){
    var targets = document.getElementById('targets').getElementsByTagName('tbody')[0];
    var i;
    for(i=0; i < targets.children.length; i++){
        if(targets.children[i].id == oid){
            targets.removeChild(targets.children[i]);
        }
    }    
}

function fill_timer_targets(id){
    var objects = document.getElementById(id);
    var result = json_rpc('getObjects', '\"kind\":\"all\"');
    for(var i=0; i<result.length; i++){
        var kind = result[i].kind;
        if(kind == 'equipment' || kind == 'cli' || kind == 'timer' || kind == 'users') {
            continue;
        }
        var oid = result[i].oid;
        var option = document.createElement('option');
        option.value = oid;
        option.innerHTML = result[i].name;
        objects.appendChild(option);
    }
}

function check_days(){
    var i, day, id = this.id;

    for(i=0;i<7;i++){
        day = document.getElementById('d'+i);
        if((id === 'timer-workdays' && (i===5 || i===6)) || (id === 'timer-holidays' && i<5)){
            if(day.checked) day.checked = false;
            continue;
        }
        day.checked = true;
    }
}

/* 
 * UI for PBX trunks
 */

function load_trunk(result){
    PbxObject.oid = result.oid;
    PbxObject.name = result.name;
    PbxObject.kind = 'trunk';
    
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
    if(PbxObject.oid) jprms += '"oid":"'+PbxObject.oid+'",';
    if(PbxObject.name) {
        handler = set_object_success;
    }
    else{
        PbxObject.name = name;
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
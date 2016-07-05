$(document).ready(function () {
    // Usuário autenticado?
    var loggedUser;

    console.log('ready');

    var provider = new firebase.auth.GithubAuthProvider();
    provider.addScope('user');

    //****************** Auth ******************
    $('#buttton-auth').click(function () {
        firebase.auth().signInWithPopup(provider).then(function (result) {
            // var token = result.credential.accessToken;
            console.log('firebase.auth > user', result.user);
            loggedIn(result.user);
        }).catch(function (error) {
            console.log('error', error);
            alert(error.message);
        });
    });

    firebase.auth().onAuthStateChanged(function (user) {
        if (user==undefined || user==null || user.displayName==undefined)
            return;
        loggedUser = user;
        console.log('user', user);
        if (user == null)
            $('#div-must-auth').show(400);
        else {
            $('#div-must-auth').hide(200);
            loggedIn(user);
        }
    });

    function loggedIn(user) {
        writeUserData(user.uid, user.displayName, user.photoURL);
        startChat();
        setPresence();
    }

    function writeUserData(userId, displayName, photoUrl) {
        firebase.database().ref('users/' + userId).set({
            displayName: displayName,
            photoUrl: photoUrl
        });
    }

    function setPresence() {
        var presenceRef = firebase.database().ref('users/'+loggedUser.uid+'/connections');
        var lastOnlineRef = firebase.database().ref('users/'+loggedUser.uid+'/lastOnline');
        var connectedRef = firebase.database().ref('.info/connected');

        connectedRef.on('value', function(snap) {
            setSendEnabled(snap.val() === true);
            if (snap.val() === true) {
                console.log('connectedRef.on > value','conected');
                var con = presenceRef.push(true);
                con.onDisconnect().remove();
                lastOnlineRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
            } else if (snap.val()===false){
                console.log('connectedRef.on > value','disconected');
            }
        });
    }


    //****************** Messages ************************
    var messagesRef;

    function startChat() {
        $('#div-chat').show();
        $('#button-users').show();

        // Get messages
        if (messagesRef!=undefined)
            return;

        messagesRef = firebase.database().ref('messages/');

        messagesRef.limitToFirst(1).on('value',function (snapshot) {
            console.log('messagesRef.limitToFirst(1).on > value', snapshot.val());
        });

        function addMessage(key,message) {
            if ($('#li-message-'+key).length) return;
            var template = $('#message-template').html();
            template = template.replace('{key}', key);
            template = template.replace('{user-name}', message.userDisplayName);
            template = template.replace('{photo-url}', message.userPhotoUrl);
            template = template.replace('{body}', message.body);
            $('#ul-messages').prepend(template);
            $('#div-loading').hide();
        }

        function delMessage(key) {
            $('#li-message-'+key).hide(1000);
        }

        messagesRef.on('child_added', function (data) {
            console.log('messagesRef.on > child_added', data.val());
            addMessage(data.key,data.val());
        });
        messagesRef.on('child_removed', function (data) {
            console.log('messagesRef.on > child_removed', data);
            delMessage(data.key);
        });

        $('#button-send').click(function () {
            sendMessage();
        });

        $(document).keypress(function(e) {
            if(e.which == 13)
                sendMessage();
        });
    }

    function sendMessage() {
        var message = $('#input-message').val();
        if (message.trim()=='') return;
        $('#input-message').attr("disabled", true);
        var data = {
            userDisplayName: loggedUser.displayName,
            userPhotoUrl : loggedUser.photoURL,
            uid: loggedUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            body: message
        };
        var newMessageKey = firebase.database().ref('messages/').push(data,function(){
            $('#input-message').attr("disabled", false);
            $('#input-message').val('');
            $('#input-message').focus();
        });
    }



    function setSendEnabled(enabled) {
        $('#div-send').show(200);
        $('#input-message').attr("disabled", !enabled);
        $('#button-send').attr("disabled", !enabled);
    }


    //****************** Users ************************
    var usersRef;

    function listenUsers() {
        function addUser(key,user) {
            var template = $('#user-template').html();
            template = template.replace('{key}', key);
            template = template.replace('{class}','');
            template = template.replace('{user-name}', user.displayName);
            template = template.replace('{photo-url}', user.photoUrl);
            $('#ul-users-online').prepend(template);
            setUserStatus(key,user);
        }

        function setUserStatus(key,user) {
            if (user.lastOnline!=undefined){
                $('#li-user-'+key).removeClass('online').addClass('offline');
            } else {
                $('#li-user-'+key).removeClass('offline').addClass('online');
            }
        }

        usersRef = firebase.database().ref('users/');

        usersRef.on('child_added', function (data) {
            console.log('usersRef.on > child_added', data.val());
            addUser(data.key,data.val());
        });
        usersRef.on('child_changed', function (data) {
            console.log('usersRef.on > child_changed', data.val());
            setUserStatus(data.key,data.val());
        });
    }

    $('#button-users').click(function () {
        if (usersRef==undefined)
            listenUsers();
        $('#div-users').toggle(200);
        $('#div-chat').toggle(200);
    });

});
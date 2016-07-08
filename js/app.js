$(document).ready(function () {
    // Este código foi escrito de forma a ser fácil de ser explicado
    // por isso as coisas podem parecer fora do lugar, mas é para ser
    // apresentado mais facilmente

    //****************** Auth ******************

    var loggedUser;

    firebase.auth().onAuthStateChanged(function (user) {
        loggedUser = user;
        console.log('firebase.auth.onAuthStateChanged > user', user);
        if (user == null) {
            $('#div-must-auth').show(400);
        } else {
            $('#div-must-auth').hide(200);
            loggedIn(user);
        }
    });

    $('#buttton-auth').click(function () {
        var provider = new firebase.auth.GithubAuthProvider();
        provider.addScope('user');
        firebase.auth().signInWithPopup(provider).then(function (result) {
            console.log('firebase.auth.signInWithPopup > user', result.user);
            loggedIn(result.user);
        }).catch(function (error) {
            console.log('error', error);
            alert(error.message);
        });
    });


    function loggedIn(user) {
        writeUserData(user.uid, user.displayName, user.photoURL);
        startChat();
        setPresence(user);
    }

    function writeUserData(userId, displayName, photoUrl) {
        firebase.database().ref('users/' + userId).set({
            displayName: displayName,
            photoUrl: photoUrl
        });
    }

    function setPresence(user) {
        var presenceRef = firebase.database().ref('users/' + user.uid + '/connections');
        var lastOnlineRef = firebase.database().ref('users/' + user.uid + '/lastOnline');
        var connectedRef = firebase.database().ref('.info/connected');

        connectedRef.on('value', function (snap) {
            //setSendEnabled(snap.val() === true);
            setSendEnabled(true);
            if (snap.val() === true) {
                console.log('connectedRef.on > value', 'conected');
                var con = presenceRef.push(true);
                con.onDisconnect().remove();
                lastOnlineRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
            } else if (snap.val() === false) {
                console.log('connectedRef.on > value', 'disconected');
            }
        });

        $('#button-users').show();
        $('#button-users').click(function () {
            if (usersRef == undefined)
                listenUsers();
            $('#div-users').toggle(200);
            $('#div-chat').toggle(200);
        });
    }

    //****************** Messages ************************
    var messagesRef;

    function startChat() {
        $('#div-chat').show();
        $('#button-send').click(function () {
            sendMessage();
        });
        $(document).keypress(function (e) {
            if (e.which == 13)
                sendMessage();
        });

        if (messagesRef != undefined)
            return;

        setSendEnabled(true);
        // return;

        function addMessage(key, message) {
            if ($('#li-message-' + key).length) return;
            var template = $('#message-template').html();
            template = template.replace('{key}', key);
            template = template.replace('{user-name}', message.userDisplayName);
            template = template.replace('{photo-url}', message.userPhotoUrl);
            template = template.replace('{body}', message.body);
            $('#ul-messages').prepend(template);
            $('#div-loading').hide();
        }

        function delMessage(key) {
            $('#li-message-' + key).hide(1000);
        }

        messagesRef = firebase.database().ref('messages/');

        messagesRef.limitToFirst(1).on('value', function (snapshot) {
            console.log('messagesRef.limitToFirst(1).on > value', snapshot.val());
        });

        messagesRef.on('child_added', function (data) {
            console.log('messagesRef.on > child_added', data.val());
            addMessage(data.key, data.val());
        });
        messagesRef.on('child_removed', function (data) {
            console.log('messagesRef.on > child_removed', data);
            delMessage(data.key);
        });
    }

    function sendMessage() {
        var message = $('#input-message').val();
        if (message.trim() == '') return;
        $('#input-message').attr("disabled", true);
        var data = {
            userDisplayName: loggedUser.displayName,
            userPhotoUrl: loggedUser.photoURL,
            uid: loggedUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            body: message
        };
        var newMessageKey = firebase.database().ref('messages/').push(data, function (data) {
            console.log('database.ref.push >', data);
        });
        $('#input-message').attr("disabled", false);
        $('#input-message').val('');
        $('#input-message').focus();
    }


    function setSendEnabled(enabled) {
        $('#div-send').show(200);
        $('#input-message').attr("disabled", !enabled);
        $('#button-send').attr("disabled", !enabled);
    }


    //****************** Users ************************
    var usersRef;

    function listenUsers() {

        function addUser(key, user) {
            var template = $('#user-template').html();
            template = template.replace('{key}', key);
            template = template.replace('{class}', '');
            template = template.replace('{user-name}', user.displayName);
            template = template.replace('{photo-url}', user.photoUrl);
            $('#ul-users-online').prepend(template);
            setUserStatus(key, user);
        }

        function setUserStatus(key, user) {
            if (user.lastOnline != undefined) {
                $('#li-user-' + key).removeClass('online').addClass('offline');
            } else {
                $('#li-user-' + key).removeClass('offline').addClass('online');
            }
        }

        usersRef = firebase.database().ref('users/');

        usersRef.on('child_added', function (data) {
            console.log('usersRef.on > child_added', data.val());
            addUser(data.key, data.val());
        });
        usersRef.on('child_changed', function (data) {
            console.log('usersRef.on > child_changed', data.val());
            setUserStatus(data.key, data.val());
        });
    }


    //**************** About ********************
    var dialog = document.querySelector('dialog');
    var showDialogButton = document.querySelector('#a-about');
    if (!dialog.showModal) {
        dialogPolyfill.registerDialog(dialog);
    }
    console.log($('.about'));
    $('.about').click(function (e) {
        e.preventDefault();
        dialog.showModal();
    });
    dialog.querySelector('.close').addEventListener('click', function () {
        dialog.close();
    });


});
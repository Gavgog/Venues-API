const fs = require("fs");
const User = require('../models/user.server.model');
const express = require('express'),
    bodyParser = require('body-parser');


exports.list = function(req, res){
    User.getAll(function(result){
        res.json(result);
    });
};

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function hashCode(s) {//very shitty hash please change at some point
    let hashon = true;//false to not hash at all
    let h;
    for(let i = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;

    if (hashon) return h;
    return s;
}

exports.create = async function (req, res) {

    let user_data = {
        "username": req.body.username,
        "email": req.body.email,
        "givenname": req.body.givenName,
        "familyname": req.body.familyName,
        "password": req.body.password
    };

    if (validateEmail(req.body.email) === false) return res.sendStatus(400);
    if (req.body.password === "") return res.sendStatus(400);

    let values = [
        user_data['username'],
        user_data['email'],
        user_data['givenname'],
        user_data['familyname'],
        hashCode(user_data['password'])
    ];

    User.insert(values,function(result){
        if (result.errno != undefined){
            if (result.errno === 1062)return res.sendStatus(400);
            return res.sendStatus(400);
        }
        res.status(201).json({"userId":result.insertId});
    });
};

exports.read = function(req, res){
    let id = req.params.userId;
    let token = req.get("X-Authorization");
    let payload;
    User.getOne(id, function(result){
        if (result.length === 0) return res.sendStatus(404);
        User.checkToken(token,id,function(success,tokenExists){
            if (success)payload = {
                "username":result[0].username,
                "email":result[0].email,
                "givenName":result[0].given_name,
                "familyName":result[0].family_name};


            else payload = {
                "username":result[0].username,
                "givenName":result[0].given_name,
                "familyName":result[0].family_name};





            res.status(200).json(payload);
        });
    });
};

exports.update = function(req, res){

    let auth = req.get("X-Authorization");//initialise all parameters
    let id = req.params.userId;
    let gName = "";
    let fName = "";
    let password = "";

    //validate email if exists
    if ((validateEmail(req.body.email) === false) && req.body.hasOwnProperty('email')) return res.sendStatus(400);


    if (req.body.hasOwnProperty('givenName')) {
        gName = req.body.givenName;
        if (gName == "")  return res.sendStatus(400);
        } // if user has entered username

    if (req.body.hasOwnProperty('familyName')) {
        fName = req.body.familyName;

        if (fName == "")  return res.sendStatus(400);
        } // if user has entered email

    if (req.body.hasOwnProperty('password')) {
        password = req.body.password
        if (password == "")  return res.sendStatus(400);
        } // if user has entered password

    if (gName == "" && fName == "" && password == "")  return res.sendStatus(400);


    if (isNaN(req.body.password) === false || req.body.password === "") return res.sendStatus(400);

    let values = [
        gName,
        fName,
        hashCode(password),
        id];

    User.checkToken(auth,id,function(success,tokenExists) {
        if (success != true && tokenExists) return res.sendStatus(403);
        if (success != true) return res.sendStatus(401);

        User.modify(values, function (result) {
            if (result.changedRows == 0) return res.sendStatus(400);
            res.json(result);
        });

    });

};

exports.delete = function(req, res){
    let id = req.params.userId;
    User.remove(id,function(result){
        res.json(result);
    });
};

//-------------------- REVIEWS -------------------------

exports.reviews = function(req, res){
    let id = req.params.userId;
    User.getReviews(id,function(result){
        res.json(result);
    });
};


//-------------------- PHOTOS -------------------------


exports.getPhoto = function(req, res){
    let id = req.params.userId;
    let contenttype = "";
    let file;

    User.getPic(id,function(result) {//check if the user already has an image or not
        if (result[0] === undefined) {
            return res.sendStatus(404);
        }
        if (result[0].profile_photo_filename == null) {
            return res.sendStatus(404);
        }

        file = result[0].profile_photo_filename;

        contenttype = file.split('.').pop();
        if (contenttype == "jpg") contenttype = "jpeg";

        let path = 'userpics/' + file;

        if (fs.existsSync(path)) {
            return res.status(200).type('image/'+contenttype).sendFile(path, {root: './'});
        } else {
            res.sendStatus(404);
        }

    });
};



exports.setPhoto = function(req, res){
    let id = req.params.userId;
    let pic = req.body;
    let auth = req.get("X-Authorization");
    const data = new Uint8Array(Buffer.from(pic));
    let bar = false;
    let code = 200;
    let contentType = req.get('content-type');
    let type;


    if (contentType === "image/png"){
        type = ".png"
    } else if (contentType === "image/jpeg"){
        type = ".jpg"
    } else {
        return res.sendStatus(400);
    }

    if (auth === undefined || auth === null)return res.sendStatus(401);

    User.checkToken(auth,id,function(success,tokenExists){
        if (success == null && tokenExists == null) return res.sendStatus(404);
        if (success != true && tokenExists) return res.sendStatus(403);


        fs.open('userpics/'+id+type, 'wx', (err, fd) => {
            if (err) {
                if (err.code === 'EEXIST') {
                    bar = true;

                    fs.unlink("userpics/"+id+type, (err) => {
                        if (err) throw err;
                    });

                    User.getPic(id,function(result){//check if the user already has an image or not
                        if (result[0].profile_photo_filename == null){
                            code = 201;
                        }

                        fs.open('userpics/'+id+type, 'wx', (err, fd) => {
                            fs.writeFile('userpics/'+id+type, data, (err) => {
                                if (err) throw err;
                                fs.close(fd, (err) => {
                                    if (err) throw err;
                                    User.setPic(id,type,auth,function(result){
                                        if (result.affectedRows === 0) return res.sendStatus(401);
                                        return res.sendStatus(code);//replaced original picture
                                    });
                                });
                            });
                        });
                    });

                    return;
                }
                throw err;
            }

            fs.writeFile('userpics/'+id+type, data, (err) => {
                if (err) throw err;
                fs.close(fd, (err) => {
                    if (err) throw err;
                    User.setPic(id,type,auth,function(result){
                        if (result.affectedRows === 0) return res.sendStatus(401);
                        return res.sendStatus(201);//creating users first picture
                    });
                });
            });
        });
    });

};

exports.deletePhoto = function(req, res){
    let id = req.params.userId;
    let token = req.get("X-Authorization");
    if (token == undefined || token == null) return res.sendStatus(401);

    User.checkToken(token,id,function(success,otherToken) {
        if (success !== true && otherToken){
            return res.sendStatus(403);
        }

        User.getPic(id,function(result) {//check if the user already has an image or not
            if (result[0] == null) {
                return res.sendStatus(404);
            }
            if (result[0].profile_photo_filename == null) {
                return res.sendStatus(404);
            }

            User.removePic(id, function (result) {
                res.sendStatus(200);
            });

        });
    });
};

//-------------------------LOGIN/OUT------------------------------

exports.login = function(req,res){
    let user = "";
    let email = "";
    let password = "";

    if (req.body.hasOwnProperty('username')) {user = req.body.username;} // if user has entered username
    if (req.body.hasOwnProperty('email')) {email = req.body.email;} // if user has entered email
    if (req.body.hasOwnProperty('password')) password = req.body.password; // if user has entered password



    let values = [user,email,hashCode(password)];
    User.authenticate(values, function(err,tk){
       if(err){
           res.sendStatus(400);
       } else {
           User.getToken(tk, function(err, token){
               if (token != null){// you are already logged in idiot
                    res.status(200).json({userId:tk,token:token});
               } else {//create new token for the user
                   User.setToken(tk, function (err,newtoken){
                       res.status(200).json({userId:tk,token:newtoken});
                   });
               }
           });

       }
    });
};

exports.logout = function(req,res){
    let token = req.get("X-Authorization");
    User.getIdFromToken(token, function(err,result){

       if (result === undefined || result === null){
           res.sendStatus(401);
       } else {
           User.removeToken(result,function(){res.sendStatus(200)});
       }

    });

};


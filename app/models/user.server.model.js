const db = require('../../config/db');
const crypto = require('crypto');

exports.getAll = function(done){
    db.getPool().query('SELECT * FROM User', function(err,rows){
       if (err) return done({"ERROR 2":err});
       return done(rows);
    });
};

exports.getOne = function(userId, done){
    db.getPool().query('SELECT * FROM User WHERE user_id = ?', userId, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

exports.insert = function(newuser,done){
    let values = [newuser[0],newuser[1],newuser[2],newuser[3],newuser[4]];
    db.getPool().query("INSERT INTO User (`username`, `email`, `given_name`, `family_name`, `password`) VALUES (?)", [values], function (err,result){
        if (err) return done(err);
        done(result);
    });
};

exports.remove = function(userId, done){
    db.getPool().query('DELETE FROM User WHERE user_id = ?', userId, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};


exports.modify = function(values, done){
    db.getPool().query('UPDATE User SET `given_name`=?,`family_name`=?,`password`=? WHERE user_id = ?', values, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

// ------------------------------- REVIEWS -------------------------------------

exports.getReviews = function(userId,done){
    db.getPool().query('SELECT * FROM Review WHERE review_author_id = ?', userId, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

// ------------------------------- PHOTOS --------------------------------------

exports.getPic = function(userId, done){
    db.getPool().query('SELECT profile_photo_filename FROM User WHERE user_id = ?', userId, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

exports.setPic = function(userId,ext,auth, done){
    db.getPool().query('UPDATE User SET `profile_photo_filename`=? WHERE user_id = ? AND auth_token = ?', [userId+ext,userId,auth], function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

exports.removePic = function(userId, done){
    db.getPool().query('UPDATE User SET `profile_photo_filename`=null WHERE user_id = ?', userId, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

// ------------------------------- LOGIN/OUT ------------------------------------

exports.authenticate = function(values,done){
    //query database get user id and password
    //check password is equal to provided pass word

    let user = values[0];
    let email = values[1];
    let password = values[2];

    db.getPool().query('SELECT user_id, password FROM User WHERE username = ? OR email = ?', [user,email], function (err,result) {
        if (err) return done(err);
        if (result.length !== 1) return done(true);
        if (result[0].password == password){
            return done(false, result[0].user_id);
        } else {
            return done('wrong password');
        }
    });
};

exports.setToken = function(id,done){//creates a new token and sets it as the users token in the database before returning the token
    let token = crypto.randomBytes(16).toString('hex');

    db.getPool().query('UPDATE User SET `auth_token`=? WHERE user_id=?', [token,id], function (err){
        if (err) return done(err);
        done(err,token);
    });
};

exports.getToken = function(id,done){
if (id === undefined || id === null) return done(true);//unauthorised

    db.getPool().query('SELECT auth_token FROM User WHERE user_id=?', id, function (err,result){
        if (err) return done(err);
        if (result.length === 0) return done(err);

        return done(null,result[0].user_id);
    });

};

exports.removeToken = function(id, done) {
    db.getPool().query('UPDATE User SET `auth_token`= NULL WHERE user_id = ?', id, function (err,rows){
        if (err) return done(err);
        done();
    });
};

// takes a token and returns the id asociated withthe token
exports.getIdFromToken = function(token, done) {
    if (token === undefined || token === null){return done(true,null);}//if handed no token

    db.getPool().query('SELECT user_id FROM User WHERE auth_token = ?', [token], function (err,result){
        if (err) return done(err);
        if (result.length !== 1){return done(err,null)}
        done(false,result[0].user_id);
    });
};

//takes a token and an id and checks if they are for the same user
//authorised (true,false)   = user id and auth token match
//not found  (false,false)  = no token or token doesnt exist
//not found  (null,null)    = user id doesnt exist
//forbidden  (false,true)   = token exists but not for said user

exports.checkToken = function(token,uid,done) {
    if (token === undefined || token === null){return done(false,false);}//if handed no token

        db.getPool().query('SELECT * FROM User WHERE user_id = ?', uid, function (err,rows){
            if (err) return done(err);
            if (rows.length !== 1)return done(null,null);


            db.getPool().query('SELECT user_id FROM User WHERE auth_token = ?', [token], function (err,result){
                if (result.length !== 1)return done(false,false);//auth token doesent exist
                if (result[0].user_id == uid) return done(true,false);//authorised
                done(false,true);//token exists not authorised as logged in user is someone else
            });
        });
};
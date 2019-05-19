const db = require('../../config/db');

exports.getAll = function(done){
    db.getPool().query('SELECT * FROM Venue', function(err,rows){
        if (err) return done({"ERROR 2":err});
        return done(rows);
    });
};

exports.getAllVenues = function(done){
    db.getPool().query(
        'SELECT Venue.venue_id,Venue.venue_name,Venue.category_id,Venue.city,Venue.short_description,Venue.latitude,Venue.longitude, VenuePhoto.photo_filename ' +
        'FROM Venue ' +
        'LEFT OUTER JOIN VenuePhoto ON Venue.venue_id = VenuePhoto.venue_id;'
        , function(err,rows){
        if (err) return done({"ERROR 2":err});
        return done(rows);
    });
};
/*
[
    {
        "venueId": 0,
        "venueName": "string",
        "categoryId": 0,
        "city": "string",
        "shortDescription": "string",
        "latitude": 0,
        "longitude": 0,
        "meanStarRating": 0,
        "modeCostRating": 0,
        "primaryPhoto": "dA3s41Ob.png",
        "distance": 1.452
    }
]
SELECT Venue.venue_id,Venue.venue_name,Venue.category_id,Venue.city,Venue.short_description,Venue.latitude,Venue.longitude, VenuePhoto.photo_filename
FROM Venue
LEFT OUTER JOIN VenuePhoto ON Venue.venue_id = VenuePhoto.venue_id
WHERE Venue.venue_id = 1;*/

exports.insert = function(venue_data,done){

    let values = [
        venue_data['user'],
        venue_data['categoryId'],
        venue_data['venueName'],
        venue_data['city'],
        venue_data['shortDescription'],
        venue_data['longDescription'],
        venue_data['date'],
        venue_data['address'],
        venue_data['latitude'],
        venue_data['longitude']
    ];
    db.getPool().query(
        "INSERT INTO `Venue`(`admin_id`, `category_id`, `venue_name`, `city`, `short_description`, `long_description`, `date_added`, `address`, `latitude`, `longitude`) VALUES (?)",
        [values], function (err,result){
        if (err) return done(err);
        done(result);
    });
};

exports.getOne = function(venue_id, done){

    let sql =   'SELECT * '+
                'FROM Venue '+
                'INNER JOIN User ON Venue.admin_id = User.user_id '+
                'INNER JOIN VenueCategory ON Venue.category_id = VenueCategory.category_id '+
                'WHERE Venue.venue_id = ?';

    db.getPool().query(sql, venue_id, function (err,rows){
        if (err) return done(err);
        if (rows.length == 0)return done(null);
        let venueName = rows[0].venue_name;
        let admin = {"userId":rows[0].admin_id
                    ,"username":rows[0].username};
        let category = {"categoryId":rows[0].category_id
                        ,"categoryName":rows[0].category_name
                        ,"categoryDescription":rows[0].category_description};

        let city = rows[0].city;
        let shortDescription = rows[0].short_description;
        let longDescription = rows[0].long_description;
        let dateAdded = rows[0].date_added;
        let address = rows[0].address;
        let latitude = rows[0].latitude;
        let longitude = rows[0].longitude;
        let photos = [];

        db.getPool().query('SELECT * FROM VenuePhoto WHERE venue_id = ?', venue_id, function (err,pics){
            if (err) return done(err);
            let tf = false;

            for (let i = 0;i < pics.length; i++){

                tf = pics[i].is_primary === 1;

                photos.push({
                    "photoFilename": pics[i].photo_filename,
                    "photoDescription": pics[i].photo_description,
                    "isPrimary": tf
                });
            }

            let payload = {
                "venueName":venueName,
                "admin":admin,
                "category":category,
                "city":city,
                "shortDescription":shortDescription,
                "longDescription":longDescription,
                "dateAdded":dateAdded,
                "address":address,
                "latitude":latitude,
                "longitude":longitude,
                "photos":photos
            };


            done(payload);
        });
    });
};


exports.getOneLite = function(venue_id, done){

    let sql =   'SELECT * FROM Venue WHERE venue_id = ?';

    db.getPool().query(sql, venue_id, function (err,rows){
        if (err) return done(err);
        if (rows.length !== 1)return done(null);

            done(rows[0]);
        });
};

exports.modify = function(values,userId,done){
    db.getPool().query('SELECT * FROM Venue WHERE admin_id = ? AND venue_id = ?', [userId,values[8]], function (err, rows){
            if (rows.length !== 1) return done(403);

            db.getPool().query(
                'UPDATE Venue SET `venue_name`=?,`category_id`=?,`city`=?,`short_description`=?,`long_description`=?,`address`=?,`latitude`=?,`longitude`=? WHERE venue_id = ?'
                , values, function (err, result){
                if (err) return done(err);
                    done(result);
            });
        });
};

// ------------------------------- Categories -------------------------------------
exports.allCategories = function(done){
    db.getPool().query('SELECT * FROM `VenueCategory`', function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

exports.getCategory = function(id,done){
    db.getPool().query('SELECT * FROM `VenueCategory` WHERE category_id = ?',id, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

// ------------------------------- REVIEWS -------------------------------------
exports.getReviews = function(values, done){
    db.getPool().query('SELECT * FROM Review WHERE reviewed_venue_id = ?', values, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

exports.newReview = function(values, done){

    let venueId = values[0];
    let xAuth = values[1];
    let reviewBody = values[2];
    let starRating = values[3];
    let costRating = values[4];
    let uid;


    db.getPool().query('SELECT user_id FROM `User` WHERE auth_token = ? ', xAuth, function (err,result){
        if (err) return done(err);
        if (result.length === 1) {
            uid = result[0].user_id;


            db.getPool().query('SELECT admin_id FROM `Venue` WHERE venue_id = ? ', venueId, function (err,admin){
                if (err) return done(err);
                if (admin[0].admin_id === uid) return done(403);


                db.getPool().query('SELECT reviewed_venue_id FROM `Review` WHERE reviewed_venue_id = ? and review_author_id = ?', [venueId,uid], function (err,reviewcount){
                    if (err) return done(err);
                    if (reviewcount.length > 0){
                        return done(403);
                    }


                    db.getPool().query('' +
                        'INSERT INTO Review (`reviewed_venue_id`, `review_author_id`, `review_body`, `star_rating`, `cost_rating`) VALUES (?)' +
                        '', [[venueId,uid,reviewBody,starRating,costRating]], function (err,rows){
                        if (err) return done(err);
                        done(rows);
                    });
                });
            });

        } else {
            done(401);//no user found with that auth token found
        }
    });

};

exports.getReviews = function(values, done){
    db.getPool().query('SELECT * FROM Review WHERE reviewed_venue_id = ?', values, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

// ------------------------------- PHOTOS -------------------------------------

exports.addPic = function(id, filename, desc, actprim, done){
    db.getPool().query('SELECT * from VenuePhoto Where venue_id = ?', id, function (err,photos){
        if (photos.length === 0) actprim = 1;

        /*db.getPool().query('UPDATE `VenuePhoto` SET is_primary=0 WHERE `venue_id` = ?; UPDATE `VenuePhoto` SET is_primary=1 WHERE `venue_id` = ? AND `photo_filename` = ?', [id,id,filename], function (err,rows){
            if (err) return done(err);
            done(rows);
        });*/

        db.getPool().query('INSERT INTO VenuePhoto (`venue_id`, `photo_filename`, `photo_description`, `is_primary`) VALUES (?)', [[id, filename, desc, actprim]], function (err,rows){
            if (err) return done(err);
            done(rows);
        });
    });
};

exports.deletePic = function(values, done){
    db.getPool().query('DELETE FROM `VenuePhoto` WHERE `venue_id` = ? AND `photo_filename` = ?', values, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};

exports.makePrimary = function(values, done){
    db.getPool().query('UPDATE `VenuePhoto` SET is_primary=0 WHERE `venue_id` = ?; UPDATE `VenuePhoto` SET is_primary=1 WHERE `venue_id` = ? AND `photo_filename` = ?', values, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};


exports.picExist = function(file,done){
    let filename = [file];
    db.getPool().query('SELECT * from VenuePhoto Where photo_filename = ?', filename, function (err,rows){
        if (err) return done(err);
        done(rows);
    });
};
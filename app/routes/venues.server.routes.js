const Venue = require('../controllers/venues.server.controller');
const multer = require('multer');

var upload = multer({ dest: 'venuepics/' });


module.exports = function (app) {
    app.route(app.rootUrl + '/venues')
        .get(Venue.listVenues)
        .post(Venue.createVenue);

    app.route(app.rootUrl + '/venues/:venue_id')
        .get(Venue.read)
        .patch(Venue.update);

    app.route(app.rootUrl + '/venues/:venue_id/reviews')
        .get(Venue.reviews)
        .post(Venue.createReview);

    app.route(app.rootUrl + '/categories')
        .get(Venue.listCategories);

    app.post(app.rootUrl + '/venues/:venue_id/photos',upload.single('photo'),Venue.addPhoto);

    app.route(app.rootUrl + '/venues/:venue_id/photos/:photo_filename')
        .get(Venue.getPhoto)
        .delete(Venue.removePhoto);

    app.route(app.rootUrl + '/venues/:venue_id/photos/:photo_filename/setPrimary')
        .post(Venue.setPrimary);

};

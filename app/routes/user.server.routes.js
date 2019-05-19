const User = require('../controllers/user.server.controller');



module.exports = function (app) {
    app.route(app.rootUrl + '/users')
        .get(User.list)
        .post(User.create);

    app.route(app.rootUrl + '/users/login')
        .post(User.login);

    app.route(app.rootUrl + '/users/logout')
        .post(User.logout);

    app.route(app.rootUrl + '/users/:userId')
        .get(User.read)
        .patch(User.update)
        .delete(User.delete);

    app.route(app.rootUrl + '/users/:userId/reviews')
        .get(User.reviews);


    app.route(app.rootUrl + '/users/:userId/photo')
        .get(User.getPhoto)
        .put(User.setPhoto)
        .delete(User.deletePhoto);
};

const router = require('express').Router();
const favoritesController = require('../controllers/favouritesControllers');
const { authGuard } = require('../middleware/authGuard');


router.post('/add_favourite', authGuard, favoritesController.addFavorite);
router.put('/remove_favourite/:id',  favoritesController.removeFavorite);
router.get('/get_favourite', authGuard, favoritesController.getFavorites);

module.exports = router;

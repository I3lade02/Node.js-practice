const API_PORT = 3000;
const mongoose = require("mongoose");
const Joi = require('joi');
const express = require('express');
const app = express();
app.use(express.json());
app.listen(API_PORT, () => console.log('Listening on port ' + API_PORT + '...'));

mongoose
    .connect('mongodb://127.0.0.1:27017/moviesdb', { useNewUrlParser: true})
    .then(() => console.log('Connected to MongoDB!'))
    .catch(error => console.error('Could not connect to MongoDB...', error));

const movieSchema = new mongoose.Schema({
    name: String,
    year: Number,
    directorName: { type: String, required: true },
    genres: [ String ],
    isAvailable: Boolean,
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

const Movie = mongoose.model('Movie', movieSchema);

app.get('/api/movies', (req, res) => {
    Movie.find().then(movies => { res.json(movies)})
});

app.get('/api/movies/:id', (req, res) => {
    const id = String(req.params.id);
    Movie.findById(id, (err, result) => {
        if (err || !result) {
            res.status(404).send("Film nebyl naletzen.");
        }
        elseres.json(result);
    });
});

function validateMovie(movie, required = true) {
    const schema = Joi.object({
        name: Joi.string().min(3),
        directorName: Joi.string(),
        isAvailable: Joi.bool(),
        genres: Joi.array().items(Joi.string()).min(1),
        year: Joi.number()  
    });

    return schema.validate(movie, { presence: (required) ? "required" : "optional"});
}

app.post('/api/movies', (req, res) => {
    const { error } = validateMovie(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        Movie.create(req.body)
            .then(result => { res.json(result)})
            .catch(err => { res.send("Nepodařilo se uložit film!")});
    }
});
const Joi = require('joi');
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

const movies = [
	{ id: 1, name: "Kill Bill", year: 2003 },
	{ id: 2, name: "Kill Bill 2", year: 2004 },
	{ id: 3, name: "Star Wars IV", year: 1977 },
	{ id: 4, name: "Star Wars V", year: 1980 },
];

app.get('/api/movies', (req, res) => {
	res.send(movies);
});

app.get('/api/movies/:id', (req, res) => {
	const id = Number(req.params.id);
	const movie = movies.find(movie => movie.id === id);
	if (movie) {
		res.send(movie);
	} else {
		res.status(404).send('Film nebyl nalezen.');
	}
});

app.post('/api/movies', (req, res) => {
	const { error } = validateMovie(req.body);
	if (error) {
		res.status(400).send(error.details[0].message);
	} else {
		const movie = {
			id: movies.length + 1,
			name: req.body.name,
			year: req.body.year
		};
		movies.push(movie);
		res.send(movie);
	}
});

app.put('/api/movies/:id', (req, res) => {
	const id = Number(req.params.id);
	const movie = movies.find(movie => movie.id === id);
	if (!movie) {
		res.status(404).send('Film nebyl nalezen.');
		return;
	}
	const { error } = validateMovie(req.body);
	if (error) {
		res.status(400).send(error.details[0].message);
	} else {
		movie.name = req.body.name;
		movie.year = req.body.year;
		res.send(movie);
	}
});

app.delete('/api/movies/:id', (req, res) => {
	const id = Number(req.params.id);
	const movie = movies.find(movie => movie.id === id);
	if (!movie) {
		res.status(404).send('Film nebyl nalezen.');
	} else {
		const index = movies.indexOf(movie);
		movies.splice(index, 1);
		res.send(movie);
	}
});

function validateMovie(movie) {
	const schema = Joi.object({
		name: Joi.string().min(3).required(),
		year: Joi.number()
	});
	return schema.validate(movie);
}

app.listen(port, () => console.log("Listening on port " + port + "..."));
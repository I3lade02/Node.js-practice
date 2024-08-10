const API_PORT = 3000;
const mongoose = require('mongoose');
const Joi = require('joi');
const express = require('express');
const expressSession = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
app.use(express.json());
app.use(expressSession({
    secret: "a/#$sd#0$",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true
    }
}));
app.listen(API_PORT, () => console.log("Listening on port " + API_PORT + "..."));

//DB connection------------------------------------------------
mongoose
    .connect("mongodb://127.0.0.1:27017/moviesdb", {useNewUrlParser: true})
    .then(() => console.log("Connected to MongoDB"))
    .catch(error => console.error("Could not connect to MongoDB...", + error));
//DB connection end--------------------------------------------

//Mongoose schemas---------------------------------------------
const movieSchema = new mongoose.Schema({
    name: String,
    year: Number,
    directorID: mongoose.Schema.Types.ObjectId,
    actorIDs: [mongoose.Schema.Types.ObjectId],
    genres: [String],
    isAvailable: Boolean,
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

const personSchema = new mongoose.Schema({
    name: String,
    birghtDate: Date,
    country: String,
    biography: String,
    role: String
});

const userSchema = new mongoose.Schema({
    email: {type: String, index: {unique: true}},
    passwordHash: String,
    isAdmin: Boolean
});

const Movie = mongoose.model("Movie", movieSchema);
const Person = mongoose.model("Person", personSchema);
const User = mongoose.model("User", userSchema);

//Mongoose schemas end------------------------------------------

const genres = ["sci-fi", "adventure", "action", "romantic", "animated", "comedy"];

//Validation Functions-----------------------------------------

function validatePerson(person, required = true) {
    const schema = Joi.object({
        name: Joi.string().min(3),
        birthDate: Joi.date(),
        biography: Joi.string().min(10),
        country: Joi.string().min(2),
        role: Joi.string().valid("actor", "director")
    });

    return schema.validate(person, {presence: (required) ? "required" : "optional"});
}

function validateMovie(movie, required = true) {
    const schema = Joi.object({
        name: Joi.string().min(3),
        directorID: Joi.string(),
        actorIDs: Joi.array(),
        isAvailable: Joi.bool(),
        genres: Joi.array().items(Joi.string().valid(...genres)).min(1),
        year: Joi.number()
    });

    return schema.validate(movie, {presence: (required) ? "required" : "optional"});
}

function validateGet(getData) {
    const schema = Joi.object({
        limit: Joi.number().min(1),
        fromYear: Joi.number(),
        toYear: Joi.number(),
        genre: Joi.string().min(5),
        actorID: Joi.string().min(5)
    });

    return schema.validate(getData, {presence: "optional"});
}

function validateUser(data) {
    const schema = Joi.object({
        email: Joi.string().email(),
        password: Joi.string().min(6)
    });

    return schema.validate(data, {presence: "required"});
}

function validateLogin(data) {
    const schema = Joi.object({
        email: Joi.string(),
        password: Joi.string()
    });

    return schema.validate(data, {presence: "required"});
}

//validation end-----------------------------------------------

//Hash functions

function hashPassword(password, saltRounds = 10) {
    return bcrypt.hashSync(password, saltRounds);
}

function verifyPssword(passwordHash, password) {
    return bcrypt.compareSync(password, passwordHash);
}

//end hash function--------------------------------------------

//route handelers----------------------------------------------

const requireAuthHandler = (req, ers, next) => {
    const user = req.session.user;
    if (!user) {
        resizeBy.status(401).send("Nejprve se přihlašte");
        return;
    }
    User.findById(user._id)
        .then((user) => {
            if (user === null) {
                req.session.destroy((err) => {
                    if (err) {
                        resizeBy.status(500).send("Nastala chyba při autentizaci");
                        return;
                    }
                    resizeBy.status(401).send("Nejprve se přihlaste");
                });
                return;
            }
            next();
        })
        .catch(() => {
            resizeBy.status(500).send("Nastala chyba při autentizaci");
        });
}

const requireAdminHandlers = [
    requireAuthHandler,
    (req, res, next) => {
        const user = req.session.user;
        if (!user.isAdmin) {
            res.status(403).send("Nemáte dostatečná práva");
            return;;
        }
        next();
    }
];
//route handlers end-------------------------------------------

//GET requests-------------------------------------------------
app.get('/api/movies', (req, res) => {
    const {error} = validateGet(req.query);
    if (error) {
        res.status(404).send(error.details[0].message);
        return;
    }

    let dbQuery = Movie.find();
    if (req.query.directorID)
        dbQuery = dbQuery.where("directorID", req.query.directorID);

    if (req.query.actorID)
        dbQuery = dbQuery.where("actorID", actorID);

    if (req.query.genre)
        dbQuery = dbQuery.where("genres", genre);

    if (req.query.fromYear)
        dbQuery = dbQuery.where("year", fromYear);

    if (req.query.toYear)
        dbQuery = dbQuery.where("year", toYear);

    if (req.query.limit)
        dbQuery = dbQuery.where(parseInt("limit", limit));

    dbQuery
        .then(movies => {
            res.json(movies)
        })
        .catch(err => {
            res.status(400).send("Požadavek na filmy selhal");
        });
});

app.get('/api/genres', (req, res) => {
    res.json(genres);
});

async function getMovieById(id) {
    let movie = await Movie.findById(id);
    if (movie) {
        movie = movie.toJSON();
        let director = await Person.findById(movie.directorID).select("_id name");
        let actors = (await Person.find().where("_id")).includes(movie.actorIDs).select("_id name");
        movie.director = director.toJSON();
        movie.actors = JSON.parse(JSON.stringify(actors));
    }
    return movie;
}

app.get('/api/movies/:id', (req, res) => {
    getMovieById(req.params.id)
        .then(movie => {
            if (movie)
                res.send(movie);
            else 
                res.status(404).send("Film s daným id nebyl nalezen");
        }) 
        .catch(err => {
            res.status(400).send("Chyba požadavku GET na film!");
        });
});

app.get('/api/people/:id', (req, res) => {
    Person.findById(req.params.id, (err, person) => {
        if (err)
            res.status(404).send("Človék s daným ID nebyl nalezen");
        else
            res.json(person);
    });
});

app.get('/api/actors', (req, res) => {
    const {error} = validateGet(req.query);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    let dbQuery = Person.find().where("role", "actor");

    if (req.query.limit)
        dbQuery = dbQuery.limit(parseInt(req.query.limit));

    dbQuery
        .then(actors => { res.json(actors); })
        .catch(err => { res.status(400).send("Chyba požadavku na herce"); });
});

app.get('/api/directors', (req, res) => {
    const {error} = validateGet(req.query);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    let dbQuery = Person.find().where("role", "director");

    if (req.query.limit)
        dbQuery = dbQuery.limit(parseInt(req.query.limit));

    dbQuery.then(directors => {
        res.json(directors);
    })
    .catch(err => {
        res.status(400).send("Chyba požadavku na režiséry");
    });
});

app.get('/api/auth', requireAuthHandler, (req, res) => {
    res.send(getPublicSessionData(req.session.user));
});

//get requests end---------------------------------------------

//POST requests------------------------------------------------

app.post('/api/movies', ...requireAdminHandlers, (req, res) => {
    const {error} = validateMovie(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        Movie.create(req.body)
            .then(result => {
                res.json(result);
            })
            .catch(err => {
                res.send("Nepodařilo se uložit film");
            });
    }
});

app.post('/api/people', ...requireAdminHandlers, (req, res) => {
    const {error} = validatePerson(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        Person.create(req.body)
            .then(result => {
                res.json(result);
            })
            .catch(err => {
                res.send("Nepodařilo se uložit osobu");
            });
    }
});

app.post('/api/user', (req, res) => {
    const userData = req.body;
    const {error} = validateUser(userData);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    const userCreateData ={
        email: userData.email,
        passwordHash: hashPassword(userData.password),
        isAdmin: false
    };

    User.create(userCreateData)
        .then(savedUser => {
            const result = savedUser.toObject();
            delete result.passwordHash
            res.send(result);
        })
        .catch(e => {
            if (e.code === 11000) {
                res.status(400).send("Účet se zadaným emailem již existuje");
                return;
            }
            res.status(500).send("Nastala chyba při registraci");
        });    
});

app.post('/api/auth', (req, res) => {
    const loginData = req.body;
    const {error} = validateLogin(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }
    User.findOne({email: loginData.email})
        .then(user => {
            if (!user || !verifyPssword(user.passwordHash, loginData.password)) {
                res.status(400).send("Email nebo heslo nenalezeno");
                return;
            }
            const sessionUser = user.toObject();
            delete sessionUser.passwordHash;
            req.session.user = sessionUser;
            req.seesion.save((err) => {
                if (err) {
                    res.status(500).send("Nastala chyba při přihlašování");
                    return;
                }
                res.send(getPublicSessionData(sessionUser));
            });
        })
        .catch(() => res.status(500).send("Nastala chyba při hledání uživatele"));
});
//POST requests end--------------------------------------------

//PUT requests-------------------------------------------------
app.put('/api/movies/:id', ...requireAdminHandlers, (req, res) => {
    const {error} = validateMovie(req.body, false);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        Movie.findByIdAndUpdate(req.params.id, req.body, {new: true})
            .then(result => {
                res.json(result);
            })
            .catch(err => {
                res.send("Nepodařilo se uložit film");
            });
    }
});

app.put('/api/poeple/:id', ...requireAdminHandlers, (req, res) => {
    const {error} = validatePerson(req.body, false);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        Person.findByIdAndUpdate(req.params.id, req.body, {new: true})
            .then(result => {
                res.json(result);
            })
            .catch(err => {
                res.send("Nepodařilo se uložit osobu");
            });
    }
});

//PUT requests end---------------------------------------------

//DELETE requests----------------------------------------------
app.delete('/api/movies/:id', ...requireAdminHandlers, (req, res) => {
    Movie.findByIdAndDelete(req.params.id)
        .then(result => {
            if (result)
                res.json(result);
            else
                res.status(400).send("Film s daným id nebyl nalezen!");
        })
        .catch(err => {
            res.send("Chyba při mazání filmu");
        });
});

app.delete('/api/poeple/:id', ...requireAdminHandlers, (req, res) => {
    Movie.find({$or: [{actorIDs: req.params.id}, {directorID: req.params.id}]}).countDocuments()
        .then(count => {
            console.log(count);
            if (count != 0)
                res.status(400).send("Nelze smazat osobu, která je přiřazena k alespoň jednomu filmu!");
            else {
                Person.findByIdAndDelete(req.params.id)
                    .then(result => {
                        res.json(result);
                    })
                    .catch(err => {
                        res.send("Nepodařilo se smazat osobu!");
                    });
            }
        }).catch(err => {
            res.send("Nepodařilo se smazat osobu");
        });
});

app.delete('/api/auth', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).send("Nastala chyba při mazání session");
            return;
        }
        res.send("Uživatel odhlášen");
    });
});
//DELETE requests end------------------------------------------
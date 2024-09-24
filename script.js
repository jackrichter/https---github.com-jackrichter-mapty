'use strict';

class Workout {
  date = new Date();
  id = Date.now().toString(16).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [Lat, Lng]
    this.distance = distance; // in km
    this.duration = duration; // in mim
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.name[0].toUpperCase()}${this.name.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  name = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // number of steps it took
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }

  click() {
    this.clicks++;
  }
}

class Cycling extends Workout {
  name = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain; // in meters
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Test of classes
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycle1);

/////////////////////////////////////////////////////////

// Application Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Using the browser's Geolocation Api
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
    }
  }

  _loadMap(position) {
    // Using 'Destructuring' to get the corresponding variables values from object coords.
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.se/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // console.log(this);

    // Adding Leaflet code example
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Re-render the stored workouts markers as the map has been loaded
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper functions for inputs validation
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp >= 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // Obs. Getting value always returns a string, thus it has to be converted to a number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs((distance, duration, elevation)) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new object to workouts array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Hide the form and clear input fields
    this._hideForm();

    // Render workout on map as marker (display Marker)
    this._renderWorkoutMarker(workout);

    // Set local storage to store workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.name}-popup`,
        })
      )
      .setPopupContent(
        `${workout.name === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.name}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.name === 'running' ? '🏃' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.name === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }

    if (workout.name === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEL = e.target.closest('.workout');
    // console.log(workoutEL);

    if (!workoutEL) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    // Center the map to the workout in list
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Using the public interface
    // workout.click();       // Not working with localStorage
    // console.log(workout);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    // Set back the data
    this.#workouts = data;

    // Re-render the stored workouts as the side bar list
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work); // OBS! It will not work simply like that because the map is not yet loaded. Async problem!
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // OBS! Reloads the page.
  }
}

const app = new App();

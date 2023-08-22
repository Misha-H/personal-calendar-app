import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import invert from 'invert-color';
import L from 'leaflet';
import tippy from 'tippy.js';

import { usersDb } from './utils';

import 'leaflet/dist/leaflet.css';
import 'tippy.js/themes/light.css';

import './style.css';

import type { EventInput } from '@fullcalendar/core';
import type { EventImpl } from '@fullcalendar/core/internal';
import type { LeafletMouseEvent } from 'leaflet';
import type { Instance } from 'tippy.js';

interface WeatherDay {
  date: number;
  max: number;
  min: number;
}

type Weather = Array<WeatherDay>;

interface CustomEventProps extends EventImpl {
  extendedProps: {
    /**
     * Event description.
     */
    description: string;

    /**
     * Event location.
     */
    location: string;
  };
}

interface EventsDb {
  events: Array<EventInput>;
}

interface User {
  id: number;
  username: string;
  password: string;
}

function initCalendarPage() {
  let _eventsDb: EventsDb = {
    events: [],
  };

  let $tooltip: Instance;

  const eventsDb = {
    NAME: 'events',
    save(): void {
      localStorage.setItem(this.NAME, JSON.stringify(_eventsDb));
      console.log('[DB]: SAVE');
    },
    read(): void {
      _eventsDb = JSON.parse(localStorage.getItem(this.NAME)!);
    },
    addEvent(event: EventInput): void {
      _eventsDb.events.push(event);
      this.save();
    },
    removeEvent(id: string): void {
      _eventsDb.events = _eventsDb.events.filter((event) => event.id !== id);
      this.save();
    },
    getEvents() {
      return _eventsDb.events;
    },
  };

  const weather: Weather = [];

  const getWeather = async (startDate: string, endDate: string) => {
    try {
      const response = await (
        await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21&hourly=temperature_2m&forecast_days=16&timezone=auto&daily=temperature_2m_max&daily=temperature_2m_min&start_date=${startDate}&end_date=${endDate}`
        )
      ).json();
      console.log(response);

      // checking if the api returns an error, specific to this api.
      if (response.error) {
        return;
      }

      const dailyTimes: Array<string> = response.daily.time;

      for (let i = 0; i < dailyTimes.length; i++) {
        weather.push({
          date: new Date(dailyTimes[i]).setHours(0, 0, 0, 0),
          max: Math.round(response.daily.temperature_2m_max[i]),
          min: Math.round(response.daily.temperature_2m_min[i]),
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  (async () => {
    /**
     * Define available form inputs elements.
     */
    interface FormInputElements extends HTMLFormControlsCollection {
      'event-date-start': HTMLInputElement;
      'event-date-end': HTMLInputElement;
      'event-title': HTMLInputElement;
      'event-colour': HTMLInputElement;
      'event-description': HTMLInputElement;
      'event-location': HTMLInputElement;
    }

    /**
     * @remarks
     * Given:
     * ```html
     * <form>
     *   <input type='text' name="event-date" value='Hello' />
     *   <input type='text' name="event-title" value='World!' />
     * </form>
     * ```
     *
     * Extend `HTMLFormElement` to include HTML `<form>` inputs.
     *
     * @example
     * From: `HTMLFormElement`:
     * ```ts
     * {
     *   elements: {};
     * }
     * ```
     *
     * To: `AddEventFormElement`:
     * ```ts
     * {
     *   elements: {
     *     'event-date': HTMLInputElement;
     *     'event-title': HTMLInputElement;
     *   },
     * }
     * ```
     */
    interface AddEventFormElement extends HTMLFormElement {
      elements: FormInputElements;
    }

    // Change typing of form from HTMLFormElement to AddEventFormElement
    const $form = document.querySelector('form')! as AddEventFormElement;

    // Get access to the map
    let map: L.Map | null = null;

    // https://fullcalendar.io/docs/event-source-object

    function initModal(event: MouseEvent) {
      // Get access to modal
      const $modal = document.getElementById('add-event-modal')!;
      // Get access to calendar
      const $calendar = document.getElementById('calendar')!;
      // Get access to to all elements in modal with the `modal-exit` class
      const $modalExitBtns = $modal.querySelectorAll('.modal-exit');

      map = L.map('map').setView([0, 0], 0);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(
        map
      );

      let mapPin: L.Marker<any> | null = null;

      async function onMapClick(e: LeafletMouseEvent) {
        const { lat, lng } = e.latlng;

        // Remove pin if on exists
        if (mapPin) {
          mapPin.remove();
        }

        $form.elements[
          'event-location'
        ].value = `https://www.google.com/maps?q=${lat},${lng}`;

        // Add a pin to the map where user clicks
        mapPin = L.marker([lat, lng]).addTo(map!);
      }

      map.on('click', onMapClick);

      // Prevent browser from performing default actions (like refreshing page)
      event.preventDefault();

      // Get current time
      const now = new Date().toISOString().slice(0, 16);

      // Set input's time to current
      document.querySelector<HTMLInputElement>('#event-date-start')!.value =
        now;
      document.querySelector<HTMLInputElement>('#event-date-end')!.value = now;

      /**
       * Close the active modal.
       */
      function closeModal(event$: SubmitEvent | Event) {
        event$.preventDefault();
        $modal.classList.remove('active');
        $calendar.classList.remove('hidden');
        $form.removeEventListener('submit', formSubmit);
        map?.remove();
      }

      /**
       * Submit information / create event
       */
      function formSubmit(event$: SubmitEvent) {
        const event: EventInput = {
          id: Math.random().toString(16),
          title: $form.elements['event-title'].value,
          start: new Date($form.elements['event-date-start'].value).toJSON(),
          end: new Date($form.elements['event-date-end'].value).toJSON(),
          backgroundColor: $form.elements['event-colour'].value,
          textColor: invert($form.elements['event-colour'].value, true),
          extendedProps: {
            description: $form.elements['event-description'].value,
            location: $form.elements['event-location'].value,
          },
        };

        eventsDb.addEvent(event);

        calendar.addEvent(event);

        closeModal(event$);
      }

      // Make the calendar invisible
      $calendar.classList.add('hidden');
      // Make the modal visible
      $modal.classList.add('active');

      $modalExitBtns.forEach(($modalExitBtn) => {
        // Close modal on click event
        $modalExitBtn.addEventListener('click', closeModal);
      });

      // Init form
      $form.addEventListener('submit', formSubmit);
    }

    const calendar = new Calendar(document.getElementById('calendar')!, {
      //    aspectRatio: 1,
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
      customButtons: {
        addEvent: {
          text: 'Add Event',
          click: initModal,
        },
      },
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today addEvent',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek',
      },
      events: eventsDb.getEvents(),
      eventMouseEnter: (eventClickInfo) => {
        function removeEvent() {
          console.log('removeEvent');
          (eventClickInfo.event as CustomEventProps).remove();
          eventsDb.removeEvent(eventClickInfo.event.id);
        }

        const { description, location } = (
          eventClickInfo.event as CustomEventProps
        ).extendedProps;

        $tooltip = tippy(eventClickInfo.el, {
          content: `<div class="tooltip">
                    <div class="content">
                      ${description && `<strong>${description}</strong>`}
                      ${
                        location &&
                        `<a href="${location}" target="_blank">Location</a>`
                      }
                    </div>
              
                    <button type="button">&#x2716;</button>
                  </div>`,
          placement: 'top',
          animation: 'scale-subtle',
          interactive: true,
          hideOnClick: false,
          allowHTML: true,
          onMount(instance) {
            instance.popper
              .querySelector('button')
              ?.addEventListener('click', removeEvent);
          },
          onDestroy(instance) {
            instance.popper
              .querySelector('button')
              ?.addEventListener('click', removeEvent);
          },
        });
      },
      eventMouseLeave: () => {
        setTimeout(() => $tooltip.destroy(), 20000);
      },
      /**
       *
       * @param renderProps
       * @returns Cell content.
       */
      dayCellContent: (renderProps) => {
        const dayWeather = weather.find(
          (o) => o.date === renderProps.date.getTime()
        );

        return {
          html: dayWeather
            ? `<div class="datetemp">
              <div class="date">
                <span>${renderProps.dayNumberText}</span>
              </div>
              <div class="weather">
                <div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5 12.5a1.5 1.5 0 1 1-2-1.415V9.5a.5.5 0 0 1 1 0v1.585A1.5 1.5 0 0 1 5 12.5z"/>
                      <path d="M1 2.5a2.5 2.5 0 0 1 5 0v7.55a3.5 3.5 0 1 1-5 0V2.5zM3.5 1A1.5 1.5 0 0 0 2 2.5v7.987l-.167.15a2.5 2.5 0 1 0 3.333 0L5 10.486V2.5A1.5 1.5 0 0 0 3.5 1zm5 1a.5.5 0 0 1 .5.5v1.293l.646-.647a.5.5 0 0 1 .708.708L9 5.207v1.927l1.669-.963.495-1.85a.5.5 0 1 1 .966.26l-.237.882 1.12-.646a.5.5 0 0 1 .5.866l-1.12.646.884.237a.5.5 0 1 1-.26.966l-1.848-.495L9.5 8l1.669.963 1.849-.495a.5.5 0 1 1 .258.966l-.883.237 1.12.646a.5.5 0 0 1-.5.866l-1.12-.646.237.883a.5.5 0 1 1-.966.258L10.67 9.83 9 8.866v1.927l1.354 1.353a.5.5 0 0 1-.708.708L9 12.207V13.5a.5.5 0 0 1-1 0v-11a.5.5 0 0 1 .5-.5z"/>
                    </svg>
                  </span>
                  <span>${dayWeather.min}</span>
                </div>
                <div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5 12.5a1.5 1.5 0 1 1-2-1.415V2.5a.5.5 0 0 1 1 0v8.585A1.5 1.5 0 0 1 5 12.5z"/>
                      <path d="M1 2.5a2.5 2.5 0 0 1 5 0v7.55a3.5 3.5 0 1 1-5 0V2.5zM3.5 1A1.5 1.5 0 0 0 2 2.5v7.987l-.167.15a2.5 2.5 0 1 0 3.333 0L5 10.486V2.5A1.5 1.5 0 0 0 3.5 1zm5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5zm4.243 1.757a.5.5 0 0 1 0 .707l-.707.708a.5.5 0 1 1-.708-.708l.708-.707a.5.5 0 0 1 .707 0zM8 5.5a.5.5 0 0 1 .5-.5 3 3 0 1 1 0 6 .5.5 0 0 1 0-1 2 2 0 0 0 0-4 .5.5 0 0 1-.5-.5zM12.5 8a.5.5 0 0 1 .5-.5h1a.5.5 0 1 1 0 1h-1a.5.5 0 0 1-.5-.5zm-1.172 2.828a.5.5 0 0 1 .708 0l.707.708a.5.5 0 0 1-.707.707l-.708-.707a.5.5 0 0 1 0-.708zM8.5 12a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5z"/>
                    </svg>
                  </span>
                  <span>${dayWeather.max}</span>
                </div>
              </div>
            </div>`
            : `<div class="datetemp">
              <div class="date">
                <span>${renderProps.dayNumberText}</span>
              </div>
            </div>`,
        };
      },
    });

    const getISO = (date: Date) => {
      return calendar.formatIso(date).split('T')[0];
    };

    const startDate = getISO(calendar.view.activeStart);
    const nowDate = new Date().getTime();
    const calendarEndDate = calendar.view.activeEnd.getTime();
    const fortnightFromNow = nowDate + 1209600000;

    const endDate =
      fortnightFromNow > calendarEndDate ? calendarEndDate : fortnightFromNow;

    await getWeather(startDate, getISO(new Date(endDate)));

    console.log(
      calendar.view.activeStart.toISOString(),
      calendar.view.activeEnd
    );
    calendar.render();

    console.log(getISO(calendar.view.activeStart));
  })();
}

const activeUser = usersDb.getActiveUser();

// If a user is not logged in
if (!activeUser) {
  window.location.href = '/';
} else {
  initCalendarPage();
}

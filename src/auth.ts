import { usersDb } from './utils';

import type { AddEventFormElement } from './types';

// Signup form element
const $formSignup: AddEventFormElement<{
  'signup-username': HTMLInputElement;
  'signup-password': HTMLInputElement;
}> = document.querySelector('.signup form')!;

// Login form element
const $formLogin: AddEventFormElement<{
  'login-username': HTMLInputElement;
  'login-password': HTMLInputElement;
}> = document.querySelector('.login form')!;

/**
 * Handle Signup Form
 */
$formSignup.addEventListener('submit', (event: SubmitEvent) => {
  event.preventDefault();

  usersDb.addUser({
    username: $formSignup.elements['signup-username'].value,
    password: $formSignup.elements['signup-password'].value,
  });
});

/**
 * Handle Login Form
 */
$formLogin.addEventListener('submit', (event: SubmitEvent) => {
  event.preventDefault();
  console.log($formLogin.elements);

  // Set active user if credentials match
  const user = usersDb.login(
    $formLogin.elements['login-username'].value,
    $formLogin.elements['login-password'].value
  );

  // User exists in database
  if (user) {
    console.log('User exists');
    // Naviagte to calendar page
    window.location.href = '/calendar.html';
  } else {
    // User does not exist in database
    const h3 = document.createElement('h3');
    h3.textContent = 'User does not exist';
    document.body.appendChild(h3);
  }
});

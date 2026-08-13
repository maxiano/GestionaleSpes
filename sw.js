/**
 * @file sw.js
 * @brief Gestionale Tecnico - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 * 
 * Questo software è riservato esclusivamente all'uso interno della società 
 * sportiva Spes Montesacro. Ne è vietata la copia, la riproduzione o la 
 * distribuzione non autorizzata.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

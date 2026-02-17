# DNFK Infobase

DNFK Infobase is a static information website used for publishing structured announcements, documents, and reference content.  
The site is hosted on GitHub Pages and is designed for stability, simplicity, and long-term maintainability.

---

## Live Website

https://info-base.dnfk.qzz.io/

version : v 1.0.3

---

## Overview

This project is a fully static website built with HTML, CSS, and JavaScript.  
It does not rely on a backend service and is intended for low-maintenance deployment with predictable behavior.

Primary goals:

- Reliable public information delivery
- Minimal dependencies
- Clear file structure
- Cache-safe configuration handling

---

## Features

- Static site hosted via GitHub Pages
- No server-side runtime or database
- Responsive layout for desktop and mobile devices
- Centralized configuration via `config.js`
- Designed to avoid redirect and cache loop issues
- Simple deployment workflow

---

## Project Structure

```text
/
├─ index.html            # Main entry page
├─ maintenance.html      # Maintenance / fallback page
├─ assets/
│  ├─ css/               # Stylesheets
│  ├─ js/                # JavaScript files
│  └─ img/               # Images and icons
├─ info/                 # Information pages and documents
├─ config.js             # Global site configuration
└─ README.md             # Project documentation
# ImmoTrack ERP Backend

This is the central REST API for the **ImmoTrack ERP** Real Estate & Construction Management System, powered by Laravel.

## 📚 Detailed Documentation
Comprehensive project documentation is located in the `APP2/docs` folder at the root of the project:
- [Architecture Overview](../docs/architecture.md)
- [Database Schema](../docs/database_schema.md)
- [API Reference](../docs/api_reference.md)
- [Frontend Guide](../docs/frontend_guide.md)

## Requirements
- PHP >= 8.1
- Composer
- PostgreSQL / MySQL

## Quick Start
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

---
*The rest of this document contains the default Laravel documentation.*

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

## About Laravel
Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects.

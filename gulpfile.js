// Declaring Gulp constants
const
	gulp = require('gulp'),
	runSeq = require('run-sequence'),
	beep = require('beepbeep'),
	less = require('gulp-less'),
	sass = require('gulp-sass'),
	sourcemaps = require('gulp-sourcemaps'),
	concat = require('gulp-concat'),
	imagemin = require('gulp-imagemin'),
	plumber = require('gulp-plumber'),
	jshint = require('gulp-jshint'),
	gutil = require('gulp-util'),
	gulpIf = require('gulp-if'),
	gulpDebug = require('gulp-debug'),
	notify = require('gulp-notify');

const
	postcss = require('gulp-postcss'),
	autoprefixer = require('autoprefixer'),
	cssnext = require('postcss-cssnext'),
	uncss = require('postcss-uncss'),
	cssnano = require('cssnano');

const
	browserSync = require('browser-sync').create(),
	reload = browserSync.reload;

// Config used to configure gulp tasks
const config = new (function () {
  
  this.isDevelop = true;
  
	this.paths = new (function() {
		this.html = ['src/**/*.html'];
		this.img = ['src/img/**/*'];
		this.css = ['src/css/**/*.css'];
		this.scss = ['src/scss/**/*.scss'];
		this.less = ['src/less/**/*.less'];
		this.js = ['src/js/**/*.js'];
		this.dist = ['docs/'];
	})();
	
	this.output = new (function() {
		this.cssName = 'bundle.min.css';
		this.path = './public';
	})();
})();

// Default task is run by default when you open this project
gulp.task('default', ['compile:all', 'watch:all', 'browserSync:serve']);

// Watch src folder, when appropriate files are changed in src folder - call appropriate task:
// Compile and move needed files to dist folder
gulp.task('watch:all', ['browserSync:serve', 'compile:all'], function() {
	gulp.watch(config.paths.html, {cwd: './'}, ['compile:html']).on('error', handleError); // Using cwd hack to update browser when files are
	gulp.watch(config.paths.img, {cwd: './'}, ['compile:img']).on('error', handleError); //     deleted and added
	gulp.watch(config.paths.scss, {cwd: './'}, ['compile:sass']).on('error', handleError);
  gulp.watch(config.paths.css, {cwd: './'}, ['compile:css']).on('error', handleError);
	gulp.watch(config.paths.js, {cwd: './'}, ['compile:js']).on('error', handleError);
	
	// Reload browser only when files in dist folder are changed
	// gulp.watch('./docs/**/*').on('change', browserSync.reload);
});

gulp.task('compile:all', ['compile:html', 'compile:img', 'compile:sass', 'compile:js']);


// Just move html to dist folder
gulp.task('compile:html', function() {
	gulp.src(config.paths.html)
		.pipe(gulp.dest('docs'))
		.pipe(browserSync.stream());
});


// Process images with imagemin plugin and move to dist folder
gulp.task('compile:img', function() {
	gulp.src(config.paths.img)
		.pipe(imagemin([
			imagemin.optipng({optimizationLevel: 5})
		]))
		.pipe(gulp.dest('docs/img'))
		.pipe(browserSync.stream());
});

// Compile sass to css and move to ./src/css folders
gulp.task('compile:sass', function() {
	
	// Dynamically add plugins depending on if developing or publishing
	var plugins = (function () {
		var _plugins = [
			opacityHack,
			cssnext({browsers: ['last 3 versions']})
			//uncss({html: ['src/index.html']}),
			//cssnano({autoprefixer: false})
		];
		
		// add plugins if publishing
		if (!config.isDevelop) {
			_plugins.splice(_plugins.length - 1, 0, uncss({html: ['src/index.html']}));
			_plugins.splice(_plugins.length - 1, 0, cssnano({autoprefixer: false}));
		}
		
		return _plugins
	})();
	
	gulp.src(config.paths.scss)
		.pipe(gulpIf(config.isDevelop, sourcemaps.init())) // init sourcemaps if developing
		.pipe(plumber({errorHandler: handleError})) // add plumber to catch errors
		.pipe(sass()) // compile
		.pipe(postcss(plugins)) // pass through postcss
		.pipe(gulpIf(config.isDevelop, sourcemaps.write())) // write sourcemaps if developing
		.pipe(gulp.dest('./src/css'))
		.pipe(browserSync.stream()); // Stream it to update page in real time without reloading page
});

// Compile less
gulp.task('compile:less', function() {
	var plugins = [
		opacityHack,
		cssnext({browsers: ['last 3 versions']}),
		cssnano({autoprefixer: false})
	];
	return gulp.src(config.paths.less)
		.pipe(gulpIf(config.isDevelop, sourcemaps.init()))
		.pipe(plumber({errorHandler: handleError}))
		.pipe(less())
		.pipe(concat('bundle.min.css'))
		.pipe(postcss(plugins))
		.pipe(gulpIf(config.isDevelop, sourcemaps.write()))
		.pipe(gulp.dest('./src/css'))
		.pipe(browserSync.stream());
});

// move css to dist folder
gulp.task('compile:css', function() {
	return gulp.src(config.paths.css)
			.pipe(plumber({errorHandler: handleError}))
			.pipe(concat('bundle.min.css'))
			.pipe(gulp.dest('./docs/css'))
			.pipe(browserSync.stream());
});

gulp.task('compile:js', function() {
	gulp.src(config.paths.js)
		.pipe(plumber({errorHandler: handleError}))
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(gulp.dest('docs/js'))
		.pipe(browserSync.stream());
});

gulp.task('browserSync:serve', ['compile:all'], function() {
	browserSync.init({
		server: {
			baseDir: "docs"
		},
		port: 8080,
		open: false,
		notify: false
	});
});

// Opacity hack function used by Autoprefixer
function opacityHack(css, opts) {
	css.walkDecls(function(decl) {
		if (decl.prop === 'opacity') {
			decl.parent.insertAfter(decl, {
				prop: '-ms-filter',
				value: '"progid:DXImageTransform.Microsoft.Alpha(Opacity=' + (parseFloat(decl.value) * 100) + ')"'
			});
		}
	});
}

// Error handler used by Gulp to catch and display errors without destroying tasks
function handleError(error) {
	notify.onError({
		title: "Gulp error in " + error.plugin,
		message: error.toString()
	})(error);
	
	beep();
	this.emit('end');
}
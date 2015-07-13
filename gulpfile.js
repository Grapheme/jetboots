var project = {
	open: false
};

var gulp = require('gulp'),
	connect = require('gulp-connect'),
	open = require('gulp-open'),
	jade = require('gulp-jade'),
	sass = require('gulp-sass'),
	gulpIgnore = require('gulp-ignore'),
	wiredep = require('wiredep').stream,
	concat = require('gulp-concat'),
	prefix = require('gulp-autoprefixer');
	 
var build_path = './build';
var app_path = './src';
var port = 8080;
var exclude = 	[
					app_path + '/views/**/*.jade',
					app_path + '/styles/**/*.scss',
					app_path + '/scripts/**/*.js'
				];
 
gulp.task('server', function() {
	connect.server({
		root: build_path,
		livereload: true
	});
	gulp.src(build_path + '/index.html')
		.pipe(open('', { url: 'http://localhost:' + port }));
	if(project.open) {
		gulp.src(project.open)
			.pipe(open(''));
	}
});

gulp.task('scripts', function() {
  return gulp.src([
  		'bower_components/jquery/dist/jquery.min.js',
  		app_path + '/scripts/main.js'])
    .pipe(concat('main.concat.js'))
    .pipe(gulp.dest(build_path + '/scripts/'))
    .pipe(connect.reload());
});

gulp.task('wiredep', function () {
	return gulp.src([
			])
	  .pipe(concat('vendor.css'))
	  .pipe(gulp.dest(build_path + '/styles/'))
	  .pipe(connect.reload());
	// gulp.src(app_path + '/styles/*.scss')
	// 	.pipe(wiredep())
	// 	.pipe(gulp.dest(app_path + '/styles'));
	// gulp.src(app_path + '/views/**/*.jade')
	// 	.pipe(wiredep())
	// 	.pipe(gulp.dest(app_path + '/views'));
});

gulp.task('jade', function() {
	gulp.src(app_path + '/views/*.jade')
		.pipe(jade())
		.pipe(gulp.dest(build_path))
		.pipe(connect.reload());
});

gulp.task('sass', function () {
	gulp.src(app_path + '/styles/main.scss')
		.pipe(sass.sync().on('error', sass.logError))
		.pipe(prefix("last 3 version", "> 1%", "ie 8", "ie 7"))
		.pipe(gulp.dest(build_path + '/styles'))
		.pipe(connect.reload());
});

gulp.task('copy', function () {
	gulp.src([	app_path + '/**/*',
				'!' + app_path + '/views/**/*.jade',
				'!' + app_path + '/styles/**/*.scss',
				'!' + app_path + '/scripts/**/*.js' ])
	    //.pipe(gulpIgnore.exclude(exclude))
	    .pipe(gulp.dest(build_path));
});

gulp.task('watch', function() {
	gulp.watch(app_path + '/views/**/*.jade', ['jade']);
	gulp.watch(app_path + '/styles/**/*.scss', ['sass']);
	gulp.watch(app_path + '/scripts/**/*.js', ['scripts']);
});

gulp.task('default', ['jade', 'scripts', 'sass', 'server', 'copy', 'watch']);
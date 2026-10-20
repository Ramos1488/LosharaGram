// LosharaGram Desktop: Qt 6 (C++), the same stack Telegram Desktop uses.
// Needs Qt 6.7+ (WebEngine). Set LOSHARAGRAM_URL or edit the default below.
#include <QApplication>
#include <QDesktopServices>
#include <QUrl>
#include <QWebEngineDesktopMediaRequest>
#include <QWebEngineNewWindowRequest>
#include <QWebEnginePage>
#include <QWebEngineProfile>
#include <QWebEngineSettings>
#include <QWebEngineView>

int main(int argc, char **argv) {
    QApplication app(argc, argv);
    app.setApplicationName("LosharaGram");
    const QString url = qEnvironmentVariable("LOSHARAGRAM_URL", "https://YOUR-PROJECT.vercel.app");

    // Named profile = persistent cookies, so the login survives restarts.
    auto *profile = new QWebEngineProfile("LosharaGram");
    profile->setPersistentCookiesPolicy(QWebEngineProfile::ForcePersistentCookies);
    // Google blocks embedded browsers; a regular Chrome UA helps (not guaranteed).
    profile->setHttpUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

    auto *page = new QWebEnginePage(profile);
    page->settings()->setAttribute(QWebEngineSettings::ScreenCaptureEnabled, true);
    QObject::connect(page, &QWebEnginePage::newWindowRequested,
                     [](QWebEngineNewWindowRequest &r) { QDesktopServices::openUrl(r.requestedUrl()); });
    // Screen sharing: pick the primary screen.
    QObject::connect(page, &QWebEnginePage::desktopMediaRequested,
                     [](const QWebEngineDesktopMediaRequest &r) { r.selectScreen(r.screensModel()->index(0)); });

    QWebEngineView view;
    view.setPage(page);
    view.setWindowTitle("LosharaGram");
    view.resize(1280, 800);
    view.load(QUrl(url));
    view.show();
    return app.exec();
}

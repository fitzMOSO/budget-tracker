import React from 'react'

const androidUrl = process.env.NEXT_PUBLIC_ANDROID_URL || ''
const iosUrl = process.env.NEXT_PUBLIC_IOS_URL || ''

export default function InstallPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-xl w-full bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-semibold mb-4">Install Budget Tracker</h1>

                <p className="mb-4 text-sm text-gray-600">Choose your platform to install the native app, or follow the manual steps below.</p>

                <div className="flex gap-3 mb-4">
                    {androidUrl ? (
                        <a
                            href={androidUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            🤖 Install on Android
                        </a>
                    ) : (
                        <button className="flex-1 px-4 py-3 bg-green-100 text-green-800 rounded-md" disabled>
                            🤖 Android link not configured
                        </button>
                    )}

                    {iosUrl ? (
                        <a
                            href={iosUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-md hover:opacity-90"
                        >
                             Install on iOS
                        </a>
                    ) : (
                        <button className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-md" disabled>
                             iOS link not configured
                        </button>
                    )}
                </div>

                <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-medium">Manual install instructions</summary>
                    <div className="mt-3 text-sm text-gray-700">
                        <p className="font-semibold">Android (Chrome)</p>
                        <ol className="list-decimal list-inside ml-4 mb-2">
                            <li>Open Chrome menu (⋮)</li>
                            <li>Tap "Install app" or "Add to Home screen"</li>
                            <li>Confirm to add the app</li>
                        </ol>

                        <p className="font-semibold">iOS (Safari)</p>
                        <ol className="list-decimal list-inside ml-4">
                            <li>Open Safari share menu (square + arrow)</li>
                            <li>Tap "Add to Home Screen"</li>
                            <li>Confirm to add the app</li>
                        </ol>
                    </div>
                </details>

                <p className="text-xs text-gray-500">If you want the installer buttons to link to your published store entries, set `NEXT_PUBLIC_ANDROID_URL` and `NEXT_PUBLIC_IOS_URL` in Netlify environment variables.</p>
            </div>
        </div>
    )
}

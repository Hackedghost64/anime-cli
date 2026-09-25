package com.shinsei.anime

import android.app.Application
import com.shinsei.anime.data.local.AppDatabase
import com.shinsei.anime.engine.ScriptRunner

class ShinseiApp : Application() {

    lateinit var database: AppDatabase
        private set

    lateinit var scriptRunner: ScriptRunner
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        database = AppDatabase.getInstance(this)
        scriptRunner = ScriptRunner(this)
    }

    companion object {
        lateinit var instance: ShinseiApp
            private set
    }
}

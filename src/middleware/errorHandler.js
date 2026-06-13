const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'validation_error',
            message: err.message
        })
    }

    res.status(err.status || 500).json({
        error: 'internal_error',
        message: err.message || 'Error interno del servidor'
    })
}

export default errorHandler

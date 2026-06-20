import supabase from '../config/supabase.js'

const requireAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization']

    if (!authHeader) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'Falta el header de autorización'
        })
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'Formato de token inválido. Use: Bearer <token>'
        })
    }

    const token = parts[1]

    try {
        const { data, error } = await supabase.auth.getUser(token)

        if (error) {
            return res.status(401).json({
                error: 'invalid_token',
                message: error.message
            })
        }

        req.userId = data.user.id
        next()
    } catch (error) {
        return res.status(401).json({
            error: 'invalid_token',
            message: 'Token inválido'
        })
    }
}

export default requireAuth

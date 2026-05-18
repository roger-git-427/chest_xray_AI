# Run:  streamlit run app.py
# Or:   python app.py   (re-launches via Streamlit automatically)

import sys
from pathlib import Path

import streamlit as st
from PIL import Image

from config import BEST_MODEL_PATH, IMAGE_DIR, condition_label_es

MAX_LIST = 500


@st.cache_resource(show_spinner='Cargando modelo…')
def get_model(weights_path):
    from inference import load_model
    return load_model(weights_path)


def list_images(folder, query):
    folder = Path(folder)
    if not folder.is_dir():
        return []
    q = query.strip().lower()
    names = [
        f.name for f in folder.iterdir()
        if f.suffix.lower() in ('.png', '.jpg', '.jpeg')
        and (not q or q in f.name.lower())
    ]
    return sorted(names)[:MAX_LIST]


def show_result(result, label):
    prob = result['probability']
    st.metric(f"Probabilidad de {result['condition_label']}", f'{prob:.1%}')
    if result['flagged']:
        st.warning(
            f'Marcado para revisión (por encima del umbral del {result["threshold"]:.0%}). '
            f'{result["recommendation"]}.'
        )
    else:
        st.success(f'Por debajo del umbral. {result["recommendation"]}.')
    st.caption(f'Origen: {label}')
    st.divider()
    st.caption(
        'Aviso: herramienta de tamizaje preliminar únicamente. '
        'Todos los resultados deben ser revisados por un médico calificado.'
    )


def run():
    label = condition_label_es()
    st.set_page_config(page_title=f'Tamizaje: {label}', layout='wide')
    st.title(f'Radiografía de tórax: {label}')
    st.caption('Solo tamizaje preliminar. No constituye un diagnóstico médico.')

    weights = st.sidebar.text_input('Pesos del modelo:', BEST_MODEL_PATH)
    if not Path(weights).is_file():
        st.error(
            f'No se encontraron los pesos: `{weights}`. '
            'Entrene el modelo primero o corrija la ruta.'
        )
        return

    tab_folder, tab_upload = st.tabs(['Desde carpeta', 'Subir archivo'])

    with tab_folder:
        folder = st.text_input('Carpeta de imágenes:', IMAGE_DIR)
        query = st.text_input('Filtrar por nombre:', placeholder='ej. 00000011')
        names = list_images(folder, query)

        if not names:
            st.info(
                'No hay imágenes en la carpeta (o la carpeta no existe). '
                'Ajuste la ruta o el filtro.'
            )
            return

        if len(names) == MAX_LIST:
            st.caption(
                f'Se muestran las primeras {MAX_LIST} coincidencias: acote el filtro.'
            )
        choice = st.selectbox('Seleccionar imagen:', names)
        path = Path(folder) / choice

        col_img, col_res = st.columns(2)
        with col_img:
            st.image(str(path), caption=choice, width='stretch')
        with col_res:
            if st.button('Ejecutar tamizaje', key='run_folder'):
                try:
                    model = get_model(weights)
                    from inference import predict_image
                    result = predict_image(path, model)
                    show_result(result, str(path))
                except Exception as e:
                    st.error(f'Error en la inferencia: {e}')

    with tab_upload:
        uploaded = st.file_uploader(
            'Elija una radiografía:', type=['png', 'jpg', 'jpeg']
        )
        if not uploaded:
            return

        image = Image.open(uploaded)
        col_img, col_res = st.columns(2)
        with col_img:
            st.image(image, caption=uploaded.name, width='stretch')
        with col_res:
            if st.button('Ejecutar tamizaje', key='run_upload'):
                try:
                    model = get_model(weights)
                    from inference import predict_image
                    result = predict_image(image, model)
                    show_result(result, uploaded.name)
                except Exception as e:
                    st.error(f'Error en la inferencia: {e}')


def _in_streamlit():
    try:
        from streamlit.runtime.scriptrunner import get_script_run_ctx
        return get_script_run_ctx() is not None
    except Exception:
        return False


if __name__ == '__main__' and not _in_streamlit():
    import subprocess
    print('Iniciando Streamlit…')
    raise SystemExit(
        subprocess.call([sys.executable, '-m', 'streamlit', 'run', __file__])
    )

run()
